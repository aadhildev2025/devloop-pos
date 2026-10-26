const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Helper to generate unique Invoice number: INV-YYYYMMDD-XXXX
function generateInvoiceNumber() {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyymmdd}-${randomSuffix}`;
}

exports.createSale = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      discountType = 'fixed',
      discountValue = 0,
      taxPercent = 0,
      paymentType = 'cash',
      payments = [],
      amountReceived = 0,
      changeDue = 0,
      notes = '',
      allowStockOverride = false
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty' });
    }

    // 1. Verify stock availability for all items
    const stockErrors = [];
    const enrichedItems = [];
    let subtotal = 0;
    let totalCogs = 0;

    for (const item of items) {
      const product = db.findById('products', item.productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product "${item.name}" not found` });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      const currentStock = Number(product.stock) || 0;

      if (currentStock < qty && !allowStockOverride) {
        stockErrors.push({
          productId: product.id,
          name: product.name,
          requested: qty,
          available: currentStock
        });
      }

      const unitPrice = parseFloat(item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice);
      const unitCost = parseFloat(product.purchasePrice) || 0;
      const lineDiscount = parseFloat(item.discount) || 0;
      const lineTotal = (unitPrice * qty) - lineDiscount;

      subtotal += lineTotal;
      totalCogs += (unitCost * qty);

      enrichedItems.push({
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        quantity: qty,
        unitCost,
        unitPrice,
        discount: lineDiscount,
        total: Math.max(0, lineTotal)
      });
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        requiresOverride: true,
        message: 'Insufficient stock for one or more items',
        insufficientItems: stockErrors
      });
    }

    // 2. Calculations
    let discountTotal = 0;
    if (discountType === 'percentage') {
      discountTotal = (subtotal * (parseFloat(discountValue) || 0)) / 100;
    } else {
      discountTotal = parseFloat(discountValue) || 0;
    }
    discountTotal = Math.min(subtotal, Math.max(0, discountTotal));

    const discountedSubtotal = subtotal - discountTotal;
    const taxTotal = (discountedSubtotal * (parseFloat(taxPercent) || 0)) / 100;
    const grandTotal = Math.round((discountedSubtotal + taxTotal) * 100) / 100;
    const grossProfit = Math.round((grandTotal - totalCogs) * 100) / 100;

    // 3. Payment handling
    let totalPaid = 0;
    const finalPayments = Array.isArray(payments) && payments.length > 0
      ? payments
      : [{ method: paymentType, amount: parseFloat(amountReceived) || grandTotal, reference: '' }];

    for (const p of finalPayments) {
      totalPaid += (parseFloat(p.amount) || 0);
    }

    let calculatedChangeDue = 0;
    let balanceDue = 0;
    let paymentStatus = 'paid';

    if (paymentType === 'credit') {
      balanceDue = grandTotal;
      paymentStatus = 'unpaid';
      calculatedChangeDue = 0;
    } else if (totalPaid < grandTotal) {
      balanceDue = grandTotal - totalPaid;
      paymentStatus = totalPaid > 0 ? 'partial' : 'unpaid';
    } else {
      calculatedChangeDue = Math.max(0, totalPaid - grandTotal);
      paymentStatus = 'paid';
    }

    // 4. Update Customer Balance if credit sale or balance due
    let targetCustomerId = customerId;
    let targetCustomerName = customerName || 'Walk-in Customer';
    let targetCustomerPhone = customerPhone || '';

    if (balanceDue > 0) {
      if (!targetCustomerId) {
        return res.status(400).json({
          success: false,
          message: 'A registered customer is required for credit / unpaid sales'
        });
      }

      const customer = db.findById('customers', targetCustomerId);
      if (customer) {
        const newBalance = (Number(customer.currentBalance) || 0) + balanceDue;
        const creditLimit = Number(customer.creditLimit) || 0;

        if (creditLimit > 0 && newBalance > creditLimit && !allowStockOverride) {
          return res.status(400).json({
            success: false,
            message: `Customer credit limit exceeded! Limit: Rs. ${creditLimit}, New Debt: Rs. ${newBalance}`
          });
        }

        db.updateById('customers', targetCustomerId, {
          currentBalance: newBalance,
          totalPurchases: (Number(customer.totalPurchases) || 0) + grandTotal
        });
        targetCustomerName = customer.name;
        targetCustomerPhone = customer.phone;
      }
    } else if (targetCustomerId) {
      const customer = db.findById('customers', targetCustomerId);
      if (customer) {
        db.updateById('customers', targetCustomerId, {
          totalPurchases: (Number(customer.totalPurchases) || 0) + grandTotal
        });
      }
    }

    // 5. Deduct inventory & record movement
    for (const it of enrichedItems) {
      const prod = db.findById('products', it.productId);
      if (prod) {
        const prevStock = Number(prod.stock) || 0;
        const newStock = prevStock - it.quantity;
        db.updateById('products', it.productId, { stock: newStock });

        db.create('stockAdjustments', {
          productId: it.productId,
          productName: it.name,
          sku: it.sku,
          type: 'subtraction',
          quantity: it.quantity,
          reason: 'Sale',
          notes: `Invoice ${generateInvoiceNumber()}`,
          userId: req.user ? req.user.id : 'pos',
          userName: req.user ? req.user.name : 'Cashier',
          previousStock: prevStock,
          newStock
        });
      }
    }

    // 6. Create Sale record
    const invoiceNumber = generateInvoiceNumber();
    const newSale = db.create('sales', {
      invoiceNumber,
      customerId: targetCustomerId || null,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      items: enrichedItems,
      subtotal,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      discountTotal,
      taxPercent: parseFloat(taxPercent) || 0,
      taxTotal,
      grandTotal,
      cogsTotal,
      grossProfit,
      paymentType,
      payments: finalPayments,
      amountReceived: totalPaid,
      changeDue: calculatedChangeDue,
      balanceDue,
      paymentStatus,
      cashierId: req.user ? req.user.id : 'unknown',
      cashierName: req.user ? req.user.name : 'Cashier',
      status: 'completed',
      refunds: [],
      notes
    });

    logAudit({
      action: 'SALE_COMPLETED',
      reference: invoiceNumber,
      details: `Invoice created for Rs. ${grandTotal} (${paymentType}). Items: ${enrichedItems.length}`,
      entityType: 'sale',
      entityId: newSale.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      sale: newSale
    });
  } catch (err) {
    console.error('POS Sale error:', err);
    res.status(500).json({ success: false, message: 'Failed to process checkout sale' });
  }
};

exports.getSaleByInvoice = (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const sale = db.findOne('sales', { invoiceNumber }) ||
                 db.find('sales').find(s => s.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase());

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found: ' + invoiceNumber });
    }
    res.json({ success: true, sale });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving invoice' });
  }
};

exports.getRecentSales = (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const sales = db.find('sales')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({ success: true, sales });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sales history' });
  }
};

// Hold Sale
exports.holdSale = (req, res) => {
  try {
    const { items, customer, discount, reference = '' } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot hold empty cart' });
    }

    const held = db.create('heldSales', {
      reference: reference || `Hold #${Date.now().toString().slice(-4)}`,
      items,
      customer,
      discount,
      cashierId: req.user ? req.user.id : 'cashier',
      cashierName: req.user ? req.user.name : 'Cashier'
    });

    res.json({ success: true, message: 'Sale held successfully', heldSale: held });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to hold sale' });
  }
};

exports.getHeldSales = (req, res) => {
  try {
    const list = db.find('heldSales').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, heldSales: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch held sales' });
  }
};

exports.deleteHeldSale = (req, res) => {
  try {
    const { id } = req.params;
    db.deleteById('heldSales', id);
    res.json({ success: true, message: 'Held cart removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove held sale' });
  }
};

// Process Refund / Return
exports.processRefund = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { returnItems, reason, supervisorPin, refundMethod = 'cash' } = req.body;

    const sale = db.findOne('sales', { invoiceNumber });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Select items to return' });
    }

    let refundAmount = 0;
    for (const ret of returnItems) {
      const originalItem = (sale.items || []).find(i => i.productId === ret.productId);
      if (!originalItem) {
        return res.status(400).json({ success: false, message: `Product ${ret.name} not on original invoice` });
      }

      const returnQty = parseInt(ret.quantity, 10) || 1;
      const unitRefundPrice = originalItem.unitPrice || 0;
      refundAmount += (unitRefundPrice * returnQty);

      // Restore inventory
      const product = db.findById('products', ret.productId);
      if (product) {
        const prevStock = Number(product.stock) || 0;
        const newStock = prevStock + returnQty;
        db.updateById('products', ret.productId, { stock: newStock });

        db.create('stockAdjustments', {
          productId: ret.productId,
          productName: ret.name,
          sku: originalItem.sku,
          type: 'addition',
          quantity: returnQty,
          reason: 'Customer Return & Refund',
          notes: `Return on ${invoiceNumber}: ${reason || 'Customer request'}`,
          userId: req.user ? req.user.id : 'supervisor',
          userName: req.user ? req.user.name : 'Supervisor',
          previousStock: prevStock,
          newStock
        });
      }
    }

    // Record refund record on sale
    const refundRecord = {
      refundId: `REF-${Date.now().toString().slice(-6)}`,
      items: returnItems,
      amount: refundAmount,
      reason: reason || 'Customer Return',
      refundMethod,
      authorizedBy: req.user ? req.user.name : 'Supervisor',
      refundDate: new Date().toISOString()
    };

    const existingRefunds = sale.refunds || [];
    existingRefunds.push(refundRecord);

    const totalRefunded = (sale.refundedAmount || 0) + refundAmount;
    const isFullRefund = totalRefunded >= sale.grandTotal;

    db.updateById('sales', sale.id, {
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAmount: totalRefunded,
      refunds: existingRefunds
    });

    // If sale had customer balance, reduce customer balance
    if (sale.customerId && sale.balanceDue > 0) {
      const cust = db.findById('customers', sale.customerId);
      if (cust) {
        const updatedBalance = Math.max(0, (cust.currentBalance || 0) - refundAmount);
        db.updateById('customers', cust.id, { currentBalance: updatedBalance });
      }
    }

    logAudit({
      action: 'REFUND_PROCESSED',
      reference: invoiceNumber,
      details: `Refunded Rs. ${refundAmount} for ${returnItems.length} items. Reason: ${reason}`,
      entityType: 'sale',
      entityId: sale.id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Refund of Rs. ${refundAmount} processed successfully`,
      refund: refundRecord
    });
  } catch (err) {
    console.error('Refund processing error:', err);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};
