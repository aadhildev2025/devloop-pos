const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

exports.getAllCustomers = (req, res) => {
  try {
    const { search, hasDebt } = req.query;
    let customers = db.find('customers');

    if (search) {
      const q = search.trim().toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
      );
    }

    if (hasDebt === 'true') {
      customers = customers.filter(c => Number(c.currentBalance) > 0);
    }

    customers.sort((a, b) => (Number(b.currentBalance) || 0) - (Number(a.currentBalance) || 0));

    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve customers' });
  }
};

exports.getCustomerById = (req, res) => {
  try {
    const { id } = req.params;
    const customer = db.findById('customers', id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Purchases
    const sales = db.find('sales', { customerId: id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Payments
    const payments = db.find('customerPayments', { customerId: id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      customer,
      sales,
      payments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving customer profile' });
  }
};

exports.createCustomer = (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const customerCode = data.customerCode || `CUST-${Date.now().toString().slice(-4)}`;
    const creditLimit = parseFloat(data.creditLimit) || 0;
    const initialDebt = parseFloat(data.currentBalance) || 0;

    const newCustomer = db.create('customers', {
      name: data.name.trim(),
      customerCode,
      phone: data.phone ? data.phone.trim() : '',
      address: data.address ? data.address.trim() : '',
      creditLimit,
      currentBalance: initialDebt,
      totalPurchases: initialDebt
    });

    logAudit({
      action: 'CUSTOMER_CREATED',
      reference: newCustomer.customerCode,
      details: `Registered customer "${newCustomer.name}" (Credit Limit: Rs. ${creditLimit})`,
      entityType: 'customer',
      entityId: newCustomer.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

exports.updateCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = db.findById('customers', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const updated = db.updateById('customers', id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      address: data.address !== undefined ? data.address.trim() : existing.address,
      creditLimit: data.creditLimit !== undefined ? parseFloat(data.creditLimit) : existing.creditLimit,
      customerCode: data.customerCode !== undefined ? data.customerCode.trim() : existing.customerCode
    });

    res.json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
};

// Record Customer Debt Payment
exports.recordCustomerPayment = (req, res) => {
  try {
    const { customerId } = req.params;
    const { amount, paymentMethod = 'cash', reference = '', notes = '' } = req.body;

    const customer = db.findById('customers', customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const previousBalance = Number(customer.currentBalance) || 0;
    const remainingBalance = Math.max(0, previousBalance - payAmount);

    db.updateById('customers', customer.id, { currentBalance: remainingBalance });

    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const payment = db.create('customerPayments', {
      paymentNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: payAmount,
      paymentMethod,
      reference: reference || '',
      notes: notes || '',
      collectedBy: req.user ? req.user.name : 'Cashier',
      previousBalance,
      remainingBalance
    });

    logAudit({
      action: 'CUSTOMER_DEBT_PAYMENT',
      reference: paymentNumber,
      details: `Collected Rs. ${payAmount} from ${customer.name}. Balance: ${previousBalance} -> ${remainingBalance}`,
      entityType: 'customer',
      entityId: customer.id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Payment of Rs. ${payAmount} recorded successfully`,
      payment,
      customer: { ...customer, currentBalance: remainingBalance }
    });
  } catch (err) {
    console.error('Customer payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to record debt payment' });
  }
};

// Generate Customer Statement Ledger
exports.getCustomerStatement = (req, res) => {
  try {
    const { customerId } = req.params;
    const { fromDate, toDate } = req.query;

    const customer = db.findById('customers', customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let sales = db.find('sales', { customerId });
    let payments = db.find('customerPayments', { customerId });

    if (fromDate) {
      sales = sales.filter(s => s.createdAt >= `${fromDate}T00:00:00`);
      payments = payments.filter(p => p.createdAt >= `${fromDate}T00:00:00`);
    }
    if (toDate) {
      sales = sales.filter(s => s.createdAt <= `${toDate}T23:59:59`);
      payments = payments.filter(p => p.createdAt <= `${toDate}T23:59:59`);
    }

    // Build timeline ledger
    const ledger = [];
    for (const s of sales) {
      ledger.push({
        date: s.createdAt,
        type: 'Invoice',
        reference: s.invoiceNumber,
        debit: s.grandTotal, // customer owes
        credit: (s.amountReceived || 0) - (s.balanceDue > 0 ? 0 : (s.changeDue || 0)), // paid at sale
        notes: `${s.paymentType} sale (${s.paymentStatus})`
      });
    }

    for (const p of payments) {
      ledger.push({
        date: p.createdAt,
        type: 'Payment',
        reference: p.paymentNumber,
        debit: 0,
        credit: p.amount,
        notes: `Method: ${p.paymentMethod} ${p.reference ? `(Ref: ${p.reference})` : ''}`
      });
    }

    // Sort ascending by date to compute running balance
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const enrichedLedger = ledger.map(item => {
      // Net change for customer debt
      // If invoice has balanceDue > 0, it increases balance by balanceDue
      if (item.type === 'Invoice') {
        const netDebtAdded = item.debit - item.credit;
        runningBalance += Math.max(0, netDebtAdded);
      } else if (item.type === 'Payment') {
        runningBalance = Math.max(0, runningBalance - item.credit);
      }
      return {
        ...item,
        balance: runningBalance
      };
    });

    res.json({
      success: true,
      customer,
      period: { fromDate, toDate },
      currentBalance: customer.currentBalance,
      ledger: enrichedLedger
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate customer statement' });
  }
};
