const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { generateUniqueBarcode } = require('../utils/barcode');

exports.getAllSuppliers = (req, res) => {
  try {
    const { search } = req.query;
    let suppliers = db.find('suppliers');

    if (search) {
      const q = search.trim().toLowerCase();
      suppliers = suppliers.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.businessName && s.businessName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q))
      );
    }

    suppliers.sort((a, b) => (Number(b.outstandingBalance) || 0) - (Number(a.outstandingBalance) || 0));

    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
};

exports.getSupplierById = (req, res) => {
  try {
    const { id } = req.params;
    const supplier = db.findById('suppliers', id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = db.find('purchases', { supplierId: id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const payments = db.find('supplierPayments', { supplierId: id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, supplier, purchases, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving supplier' });
  }
};

exports.createSupplier = (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplierCode = data.supplierCode || `SUP-${Date.now().toString().slice(-4)}`;
    const outstandingBalance = parseFloat(data.outstandingBalance) || 0;

    const newSupplier = db.create('suppliers', {
      supplierCode,
      name: data.name.trim(),
      businessName: data.businessName ? data.businessName.trim() : data.name.trim(),
      phone: data.phone ? data.phone.trim() : '',
      email: data.email ? data.email.trim() : '',
      address: data.address ? data.address.trim() : '',
      outstandingBalance
    });

    logAudit({
      action: 'SUPPLIER_CREATED',
      reference: newSupplier.supplierCode,
      details: `Registered supplier "${newSupplier.name}" (${newSupplier.businessName})`,
      entityType: 'supplier',
      entityId: newSupplier.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({ success: true, supplier: newSupplier });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register supplier' });
  }
};

exports.updateSupplier = (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = db.findById('suppliers', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updated = db.updateById('suppliers', id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      businessName: data.businessName !== undefined ? data.businessName.trim() : existing.businessName,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      email: data.email !== undefined ? data.email.trim() : existing.email,
      address: data.address !== undefined ? data.address.trim() : existing.address,
      supplierCode: data.supplierCode !== undefined ? data.supplierCode.trim() : existing.supplierCode
    });

    res.json({ success: true, supplier: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
};

// Create Purchase / GRN (Goods Received Note)
exports.createPurchase = (req, res) => {
  try {
    const {
      supplierId,
      supplierInvoiceNumber = '',
      purchaseDate,
      items,
      discount = 0,
      additionalCharges = 0,
      paymentType = 'cash',
      amountPaid = 0,
      receivedStatus = 'received',
      notes = ''
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier is required' });
    }

    const supplier = db.findById('suppliers', supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase must contain at least one item' });
    }

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;

      // Handle newly added product on the fly during purchase entry!
      if (item.isNewProduct) {
        let barcode = item.barcode ? String(item.barcode).trim() : generateUniqueBarcode();
        let sku = item.sku ? String(item.sku).trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`;
        product = db.create('products', {
          name: item.name.trim(),
          sku,
          barcode,
          category: item.category || 'General',
          brand: item.brand || 'Generic',
          purchasePrice: parseFloat(item.unitCost) || 0,
          sellingPrice: parseFloat(item.sellingPrice) || (parseFloat(item.unitCost) * 1.2),
          wholesalePrice: parseFloat(item.sellingPrice) || 0,
          stock: 0,
          minStockLevel: 5,
          supplierId: supplier.id,
          supplierName: supplier.name
        });
      } else {
        product = db.findById('products', item.productId);
      }

      if (!product) {
        return res.status(400).json({ success: false, message: `Product "${item.name}" not found` });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      const unitCost = parseFloat(item.unitCost) || 0;
      const totalCost = qty * unitCost;

      subtotal += totalCost;

      processedItems.push({
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        quantity: qty,
        unitCost,
        sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : product.sellingPrice,
        total: totalCost
      });

      // If marked as received, update inventory atomically
      if (receivedStatus === 'received') {
        const prevStock = Number(product.stock) || 0;
        const newStock = prevStock + qty;

        // Optionally update product's recorded purchase price
        db.updateById('products', product.id, {
          stock: newStock,
          purchasePrice: unitCost,
          supplierId: supplier.id,
          supplierName: supplier.name
        });

        db.create('stockAdjustments', {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'addition',
          quantity: qty,
          reason: 'Goods Received (Purchase)',
          notes: `Supplier: ${supplier.name} (Inv: ${supplierInvoiceNumber})`,
          userId: req.user ? req.user.id : 'purchaser',
          userName: req.user ? req.user.name : 'Purchasing Agent',
          previousStock: prevStock,
          newStock
        });
      }
    }

    const discountAmount = parseFloat(discount) || 0;
    const extraCharges = parseFloat(additionalCharges) || 0;
    const grandTotal = Math.max(0, subtotal - discountAmount + extraCharges);

    const paid = parseFloat(amountPaid) || 0;
    const balanceDue = Math.max(0, grandTotal - paid);
    const paymentStatus = balanceDue === 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

    // Update supplier outstanding balance if credit/partial
    if (balanceDue > 0) {
      const currentSupplierBal = Number(supplier.outstandingBalance) || 0;
      db.updateById('suppliers', supplier.id, {
        outstandingBalance: currentSupplierBal + balanceDue
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const purchaseNumber = `PUR-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPurchase = db.create('purchases', {
      purchaseNumber,
      supplierInvoiceNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      items: processedItems,
      subtotal,
      discount: discountAmount,
      additionalCharges: extraCharges,
      grandTotal,
      paymentType,
      amountPaid: paid,
      balanceDue,
      paymentStatus,
      receivedStatus,
      notes,
      createdBy: req.user ? req.user.name : 'Staff'
    });

    logAudit({
      action: 'PURCHASE_ORDER_CREATED',
      reference: purchaseNumber,
      details: `Received purchase from ${supplier.name} for Rs. ${grandTotal} (${paymentStatus}). Items: ${processedItems.length}`,
      entityType: 'purchase',
      entityId: newPurchase.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock updated successfully',
      purchase: newPurchase
    });
  } catch (err) {
    console.error('Create purchase error:', err);
    res.status(500).json({ success: false, message: 'Failed to record purchase' });
  }
};

exports.getAllPurchases = (req, res) => {
  try {
    const { supplierId, fromDate, toDate } = req.query;
    let purchases = db.find('purchases');

    if (supplierId) {
      purchases = purchases.filter(p => p.supplierId === supplierId);
    }
    if (fromDate) {
      purchases = purchases.filter(p => p.purchaseDate >= fromDate);
    }
    if (toDate) {
      purchases = purchases.filter(p => p.purchaseDate <= toDate);
    }

    purchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: purchases.length, purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
};

// Record Payment to Supplier
exports.recordSupplierPayment = (req, res) => {
  try {
    const { supplierId } = req.params;
    const { amount, paymentMethod = 'bank_transfer', reference = '', notes = '' } = req.body;

    const supplier = db.findById('suppliers', supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const previousBalance = Number(supplier.outstandingBalance) || 0;
    const remainingBalance = Math.max(0, previousBalance - payAmount);

    db.updateById('suppliers', supplier.id, { outstandingBalance: remainingBalance });

    const paymentNumber = `SPAY-${Date.now().toString().slice(-6)}`;
    const payment = db.create('supplierPayments', {
      paymentNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: payAmount,
      paymentMethod,
      reference,
      notes,
      paidBy: req.user ? req.user.name : 'Admin',
      previousBalance,
      remainingBalance
    });

    logAudit({
      action: 'SUPPLIER_PAYMENT',
      reference: paymentNumber,
      details: `Paid Rs. ${payAmount} to ${supplier.name}. Balance: ${previousBalance} -> ${remainingBalance}`,
      entityType: 'supplier',
      entityId: supplier.id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Supplier payment of Rs. ${payAmount} recorded successfully`,
      payment,
      supplier: { ...supplier, outstandingBalance: remainingBalance }
    });
  } catch (err) {
    console.error('Supplier payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to record supplier payment' });
  }
};

// Get Supplier Statement
exports.getSupplierStatement = (req, res) => {
  try {
    const { supplierId } = req.params;
    const supplier = db.findById('suppliers', supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = db.find('purchases', { supplierId });
    const payments = db.find('supplierPayments', { supplierId });

    const ledger = [];
    for (const p of purchases) {
      ledger.push({
        date: p.purchaseDate || p.createdAt,
        type: 'Purchase Invoice',
        reference: p.purchaseNumber,
        invoiceRef: p.supplierInvoiceNumber,
        debit: 0,
        credit: p.grandTotal, // We owe them
        paidImmediate: p.amountPaid || 0,
        notes: `${p.paymentType} purchase (${p.paymentStatus})`
      });
    }

    for (const sp of payments) {
      ledger.push({
        date: sp.createdAt,
        type: 'Payment Made',
        reference: sp.paymentNumber,
        debit: sp.amount, // Payment reduces what we owe
        credit: 0,
        paidImmediate: sp.amount,
        notes: `Method: ${sp.paymentMethod} ${sp.reference ? `(Ref: ${sp.reference})` : ''}`
      });
    }

    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const enriched = ledger.map(it => {
      if (it.type === 'Purchase Invoice') {
        runningBalance += (it.credit - it.paidImmediate);
      } else {
        runningBalance = Math.max(0, runningBalance - it.debit);
      }
      return { ...it, balance: runningBalance };
    });

    res.json({
      success: true,
      supplier,
      currentBalance: supplier.outstandingBalance,
      ledger: enriched
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve supplier statement' });
  }
};
