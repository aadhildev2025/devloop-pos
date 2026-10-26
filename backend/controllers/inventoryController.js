const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { generateUniqueBarcode } = require('../utils/barcode');

exports.getInventoryMetrics = (req, res) => {
  try {
    const products = db.find('products');
    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let totalItems = products.length;
    let totalStockUnits = 0;
    let costValuation = 0;
    let retailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    for (const p of products) {
      const stock = Number(p.stock) || 0;
      const minStock = Number(p.minStockLevel) || 5;
      const cost = Number(p.purchasePrice) || 0;
      const retail = Number(p.sellingPrice) || 0;

      totalStockUnits += stock;
      costValuation += (stock * cost);
      retailValuation += (stock * retail);

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= minStock) {
        lowStockCount++;
      }

      if (p.expiryDate) {
        if (p.expiryDate <= today) {
          expiredCount++;
        } else if (p.expiryDate <= in30Days) {
          expiringSoonCount++;
        }
      }
    }

    const potentialProfit = retailValuation - costValuation;

    res.json({
      success: true,
      metrics: {
        totalItems,
        totalStockUnits,
        costValuation,
        retailValuation,
        potentialProfit,
        lowStockCount,
        outOfStockCount,
        expiredCount,
        expiringSoonCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to compute inventory metrics' });
  }
};

exports.adjustStock = (req, res) => {
  try {
    const { productId, type, quantity, reason, notes } = req.body;

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID, type, and quantity required' });
    }

    const product = db.findById('products', productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qty = Math.abs(parseInt(quantity, 10));
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
    }

    const prevStock = Number(product.stock) || 0;
    let newStock = prevStock;

    if (type === 'addition') {
      newStock = prevStock + qty;
    } else if (type === 'subtraction') {
      if (prevStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${qty} units. Current stock is only ${prevStock}`
        });
      }
      newStock = prevStock - qty;
    } else if (type === 'set') {
      newStock = qty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustment type: addition, subtraction, or set' });
    }

    db.updateById('products', productId, { stock: newStock });

    const adjustment = db.create('stockAdjustments', {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: qty,
      reason: reason || 'Manual adjustment',
      notes: notes || '',
      userId: req.user ? req.user.id : 'user',
      userName: req.user ? req.user.name : 'Authorized Staff',
      previousStock: prevStock,
      newStock
    });

    logAudit({
      action: 'STOCK_ADJUSTMENT',
      reference: product.sku,
      details: `${product.name} stock changed: ${prevStock} -> ${newStock} (${type} ${qty}). Reason: ${reason}`,
      entityType: 'product',
      entityId: product.id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Stock updated successfully',
      adjustment,
      currentStock: newStock
    });
  } catch (err) {
    console.error('Stock adjustment error:', err);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

exports.getProductStockHistory = (req, res) => {
  try {
    const { productId } = req.params;
    const product = db.findById('products', productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Gathers adjustments
    const adjustments = db.find('stockAdjustments', { productId });

    // Gather sales containing this item
    const sales = db.find('sales');
    const saleMovements = [];
    for (const s of sales) {
      const match = (s.items || []).find(it => it.productId === productId);
      if (match) {
        saleMovements.push({
          date: s.createdAt,
          type: 'Sold',
          reference: s.invoiceNumber,
          quantity: -match.quantity,
          unitPrice: match.unitPrice,
          party: s.customerName || 'Walk-in',
          user: s.cashierName
        });
      }
    }

    // Gather purchases containing this item
    const purchases = db.find('purchases');
    const purchaseMovements = [];
    for (const p of purchases) {
      const match = (p.items || []).find(it => it.productId === productId);
      if (match) {
        purchaseMovements.push({
          date: p.createdAt || p.purchaseDate,
          type: 'Purchased',
          reference: p.purchaseNumber,
          quantity: +match.quantity,
          unitPrice: match.unitCost,
          party: p.supplierName,
          user: p.createdBy
        });
      }
    }

    // Combine into unified chronological ledger
    const history = [];

    for (const adj of adjustments) {
      history.push({
        date: adj.createdAt,
        type: adj.reason.includes('Return') ? 'Returned' : (adj.type === 'addition' ? 'Stock Added' : 'Stock Deducted'),
        reference: adj.reason,
        quantity: adj.type === 'addition' ? adj.quantity : -adj.quantity,
        previousStock: adj.previousStock,
        newStock: adj.newStock,
        notes: adj.notes,
        user: adj.userName
      });
    }

    for (const sm of saleMovements) {
      history.push({
        date: sm.date,
        type: 'Sale',
        reference: sm.reference,
        quantity: sm.quantity,
        notes: `Customer: ${sm.party}`,
        user: sm.user
      });
    }

    for (const pm of purchaseMovements) {
      history.push({
        date: pm.date,
        type: 'Purchase Received',
        reference: pm.reference,
        quantity: pm.quantity,
        notes: `Supplier: ${pm.party}`,
        user: pm.user
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      product,
      currentStock: product.stock,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve stock history' });
  }
};

// Reconcile physical inventory counts
exports.reconcileInventory = (req, res) => {
  try {
    const { items, notes = '' } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided for reconciliation' });
    }

    const results = [];
    for (const it of items) {
      const prod = db.findById('products', it.productId);
      if (prod) {
        const physicalCount = parseInt(it.physicalCount, 10);
        const systemStock = Number(prod.stock) || 0;
        const diff = physicalCount - systemStock;

        if (diff !== 0) {
          db.updateById('products', prod.id, { stock: physicalCount });
          const adj = db.create('stockAdjustments', {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: diff > 0 ? 'addition' : 'subtraction',
            quantity: Math.abs(diff),
            reason: 'Physical Stock Count Reconciliation',
            notes: notes || `Discrepancy resolved: system was ${systemStock}, counted ${physicalCount}`,
            userId: req.user ? req.user.id : 'audit',
            userName: req.user ? req.user.name : 'Stock Auditor',
            previousStock: systemStock,
            newStock: physicalCount
          });
          results.push(adj);
        }
      }
    }

    logAudit({
      action: 'INVENTORY_RECONCILIATION',
      reference: `REC-${Date.now().toString().slice(-6)}`,
      details: `Reconciliation committed for ${items.length} items (${results.length} adjustments made)`,
      entityType: 'inventory',
      entityId: 'reconciliation',
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Physical inventory reconciliation completed. ${results.length} items adjusted.`,
      adjustments: results
    });
  } catch (err) {
    console.error('Reconciliation error:', err);
    res.status(500).json({ success: false, message: 'Failed to reconcile inventory' });
  }
};

// Bulk Import from CSV / JSON
exports.bulkImportProducts = (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Products array required' });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of products) {
      if (!row.name) continue;

      let barcode = row.barcode ? String(row.barcode).trim() : '';
      let sku = row.sku ? String(row.sku).trim().toUpperCase() : '';

      // Match existing by barcode or SKU
      let existing = null;
      if (barcode) {
        existing = db.find('products').find(p => String(p.barcode).trim() === barcode);
      }
      if (!existing && sku) {
        existing = db.find('products').find(p => p.sku && p.sku.toUpperCase() === sku);
      }

      if (existing) {
        // Update stock & prices
        db.updateById('products', existing.id, {
          name: row.name || existing.name,
          category: row.category || existing.category,
          brand: row.brand || existing.brand,
          purchasePrice: row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) : existing.purchasePrice,
          sellingPrice: row.sellingPrice !== undefined ? parseFloat(row.sellingPrice) : existing.sellingPrice,
          stock: row.stock !== undefined ? parseInt(row.stock, 10) : existing.stock,
          minStockLevel: row.minStockLevel !== undefined ? parseInt(row.minStockLevel, 10) : existing.minStockLevel
        });
        updatedCount++;
      } else {
        // Create new
        if (!barcode) barcode = generateUniqueBarcode();
        if (!sku) sku = `SKU-${Date.now().toString().slice(-6)}-${createdCount}`;

        db.create('products', {
          name: row.name.trim(),
          sku,
          barcode,
          category: row.category || 'General',
          brand: row.brand || 'Generic',
          purchasePrice: parseFloat(row.purchasePrice) || 0,
          sellingPrice: parseFloat(row.sellingPrice) || 0,
          wholesalePrice: parseFloat(row.wholesalePrice || row.sellingPrice) || 0,
          stock: parseInt(row.stock, 10) || 0,
          minStockLevel: parseInt(row.minStockLevel, 10) || 5,
          supplierId: '',
          supplierName: row.supplier || '',
          expiryDate: row.expiryDate || '',
          description: row.description || ''
        });
        createdCount++;
      }
    }

    logAudit({
      action: 'BULK_PRODUCT_IMPORT',
      reference: `IMPORT-${Date.now().toString().slice(-4)}`,
      details: `Bulk imported ${products.length} rows (${createdCount} added, ${updatedCount} updated)`,
      entityType: 'product',
      entityId: 'bulk',
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Import complete: ${createdCount} products created, ${updatedCount} updated.`,
      createdCount,
      updatedCount
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, message: 'Failed to process bulk import' });
  }
};
