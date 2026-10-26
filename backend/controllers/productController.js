const db = require('../config/db');
const { generateUniqueBarcode, renderBarcodeImage } = require('../utils/barcode');
const { logAudit } = require('../utils/auditLogger');

exports.getAllProducts = (req, res) => {
  try {
    const { search, category, brand, supplier, stockStatus } = req.query;
    let products = db.find('products');

    if (search) {
      const q = search.trim().toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    if (brand && brand !== 'all') {
      products = products.filter(p => p.brand === brand);
    }

    if (supplier && supplier !== 'all') {
      products = products.filter(p => p.supplierId === supplier || p.supplierName === supplier);
    }

    if (stockStatus) {
      if (stockStatus === 'low') {
        products = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= (Number(p.minStockLevel) || 5));
      } else if (stockStatus === 'out') {
        products = products.filter(p => Number(p.stock) <= 0);
      } else if (stockStatus === 'in') {
        products = products.filter(p => Number(p.stock) > (Number(p.minStockLevel) || 5));
      } else if (stockStatus === 'expired') {
        const today = new Date().toISOString().split('T')[0];
        products = products.filter(p => p.expiryDate && p.expiryDate <= today);
      }
    }

    // Sort newest first
    products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

exports.getProductByBarcode = (req, res) => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const cleanBarcode = barcode.trim();
    const product = db.findOne('products', { barcode: cleanBarcode }) ||
                    db.find('products').find(p => String(p.barcode).trim() === cleanBarcode || String(p.sku).trim().toLowerCase() === cleanBarcode.toLowerCase());

    if (!product) {
      return res.status(404).json({
        success: false,
        exists: false,
        message: 'Product not found with barcode: ' + cleanBarcode
      });
    }

    res.json({ success: true, exists: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error querying barcode' });
  }
};

exports.getProductById = (req, res) => {
  try {
    const { id } = req.params;
    const product = db.findById('products', id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving product' });
  }
};

exports.generateBarcode = async (req, res) => {
  try {
    const format = req.query.format || 'code128';
    const barcode = generateUniqueBarcode();
    const barcodeImage = await renderBarcodeImage(barcode, format);

    res.json({
      success: true,
      barcode,
      format,
      image: barcodeImage
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate barcode' });
  }
};

exports.renderBarcode = async (req, res) => {
  try {
    const { text } = req.params;
    const format = req.query.format || 'code128';
    const image = await renderBarcodeImage(text, format);
    res.json({ success: true, text, image });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Barcode rendering error' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    // Unique barcode check / generation
    let barcode = (data.barcode && data.barcode.trim()) ? data.barcode.trim() : generateUniqueBarcode();

    const existingBarcode = db.find('products').find(p => String(p.barcode).trim() === barcode);
    if (existingBarcode) {
      return res.status(400).json({
        success: false,
        message: `Barcode "${barcode}" already assigned to product "${existingBarcode.name}"`
      });
    }

    // SKU generation if missing
    let sku = (data.sku && data.sku.trim()) ? data.sku.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`;
    const existingSku = db.find('products').find(p => p.sku && p.sku.toUpperCase() === sku);
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `SKU "${sku}" is already in use by product "${existingSku.name}"`
      });
    }

    const purchasePrice = parseFloat(data.purchasePrice) || 0;
    const sellingPrice = parseFloat(data.sellingPrice) || 0;
    const wholesalePrice = data.wholesalePrice ? parseFloat(data.wholesalePrice) : sellingPrice;
    const initialStock = parseInt(data.stock, 10) || 0;
    const minStockLevel = parseInt(data.minStockLevel, 10) || 5;

    const newProduct = db.create('products', {
      name: data.name.trim(),
      sku,
      barcode,
      category: data.category || 'General',
      brand: data.brand || 'Generic',
      purchasePrice,
      sellingPrice,
      wholesalePrice,
      stock: initialStock,
      minStockLevel,
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      expiryDate: data.expiryDate || '',
      image: data.image || '',
      description: data.description || ''
    });

    // Record initial stock opening balance in adjustments log
    if (initialStock > 0) {
      db.create('stockAdjustments', {
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'addition',
        quantity: initialStock,
        reason: 'Initial Opening Stock',
        notes: 'Product creation initial stock entry',
        userId: req.user ? req.user.id : 'system',
        userName: req.user ? req.user.name : 'System',
        previousStock: 0,
        newStock: initialStock
      });
    }

    logAudit({
      action: 'PRODUCT_CREATED',
      reference: newProduct.sku,
      details: `Created product "${newProduct.name}" (Barcode: ${newProduct.barcode}, Stock: ${newProduct.stock})`,
      entityType: 'product',
      entityId: newProduct.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = db.findById('products', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check barcode duplicates if changed
    if (data.barcode && data.barcode.trim() !== existing.barcode) {
      const duplicateBarcode = db.find('products').find(
        p => p.id !== id && String(p.barcode).trim() === data.barcode.trim()
      );
      if (duplicateBarcode) {
        return res.status(400).json({
          success: false,
          message: `Barcode "${data.barcode}" is already used by "${duplicateBarcode.name}"`
        });
      }
    }

    // Price change tracking
    const oldSellingPrice = existing.sellingPrice;
    const oldPurchasePrice = existing.purchasePrice;

    const updates = {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      sku: data.sku !== undefined ? data.sku.trim().toUpperCase() : existing.sku,
      barcode: data.barcode !== undefined ? data.barcode.trim() : existing.barcode,
      category: data.category !== undefined ? data.category : existing.category,
      brand: data.brand !== undefined ? data.brand : existing.brand,
      purchasePrice: data.purchasePrice !== undefined ? parseFloat(data.purchasePrice) : existing.purchasePrice,
      sellingPrice: data.sellingPrice !== undefined ? parseFloat(data.sellingPrice) : existing.sellingPrice,
      wholesalePrice: data.wholesalePrice !== undefined ? parseFloat(data.wholesalePrice) : existing.wholesalePrice,
      minStockLevel: data.minStockLevel !== undefined ? parseInt(data.minStockLevel, 10) : existing.minStockLevel,
      supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
      supplierName: data.supplierName !== undefined ? data.supplierName : existing.supplierName,
      expiryDate: data.expiryDate !== undefined ? data.expiryDate : existing.expiryDate,
      image: data.image !== undefined ? data.image : existing.image,
      description: data.description !== undefined ? data.description : existing.description
    };

    const updated = db.updateById('products', id, updates);

    // Audit price changes
    if (oldSellingPrice !== updated.sellingPrice || oldPurchasePrice !== updated.purchasePrice) {
      logAudit({
        action: 'PRODUCT_PRICE_UPDATED',
        reference: updated.sku,
        details: `Selling: ${oldSellingPrice} -> ${updated.sellingPrice}, Purchase: ${oldPurchasePrice} -> ${updated.purchasePrice}`,
        entityType: 'product',
        entityId: updated.id,
        user: req.user,
        ip: req.ip
      });
    }

    logAudit({
      action: 'PRODUCT_UPDATED',
      reference: updated.sku,
      details: `Updated details for product "${updated.name}"`,
      entityType: 'product',
      entityId: updated.id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

exports.deleteProduct = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.findById('products', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    db.deleteById('products', id);

    logAudit({
      action: 'PRODUCT_DELETED',
      reference: existing.sku,
      details: `Deleted product "${existing.name}" (Barcode: ${existing.barcode})`,
      entityType: 'product',
      entityId: id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Product removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};
