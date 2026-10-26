import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  History,
  ClipboardCheck,
  Edit,
  Trash2,
  Calendar,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Tag,
  Printer
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Inventory({ onNavigateTab }) {
  const { user, formatCurrency } = useAuth();

  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');

  // Modals
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [selectedForAdjustment, setSelectedForAdjustment] = useState(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [stockHistory, setStockHistory] = useState(null);
  const [reconciliationModal, setReconciliationModal] = useState(false);
  const [reconcileList, setReconcileList] = useState([]);
  const [importModal, setImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Beverages',
    brand: '',
    purchasePrice: '',
    sellingPrice: '',
    wholesalePrice: '',
    stock: '',
    minStockLevel: '5',
    supplierName: '',
    expiryDate: '',
    description: ''
  });

  const [adjData, setAdjData] = useState({
    type: 'addition', // 'addition' | 'subtraction' | 'set'
    quantity: '',
    reason: 'Stock Count Correction',
    notes: ''
  });

  // New Price Batch state
  const [batchModal, setBatchModal] = useState(false);
  const [batchSource, setBatchSource] = useState(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    purchasePrice: '',
    sellingPrice: '',
    stock: '20',
    minStockLevel: '5'
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, metricRes] = await Promise.all([
        apiRequest(`/products?search=${encodeURIComponent(search)}&category=${selectedCategory}&stockStatus=${stockStatus}`),
        apiRequest('/inventory/metrics')
      ]);

      if (prodRes.success) setProducts(prodRes.products);
      if (metricRes.success) setMetrics(metricRes.metrics);
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search, selectedCategory, stockStatus]);

  // Open Add Product Modal
  const handleOpenAdd = async () => {
    setEditingProduct(null);
    try {
      // Auto generate a unique barcode
      const barRes = await apiRequest('/products/barcode/generate');
      setFormData({
        name: '',
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        barcode: barRes.barcode || '',
        category: 'Beverages',
        brand: '',
        purchasePrice: '',
        sellingPrice: '',
        wholesalePrice: '',
        stock: '10',
        minStockLevel: '5',
        supplierName: '',
        expiryDate: '',
        description: ''
      });
      setProductModal(true);
    } catch (e) {
      setProductModal(true);
    }
  };

  // Open Edit Product Modal
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      category: p.category || 'General',
      brand: p.brand || '',
      purchasePrice: p.purchasePrice || '',
      sellingPrice: p.sellingPrice || '',
      wholesalePrice: p.wholesalePrice || '',
      stock: p.stock || 0,
      minStockLevel: p.minStockLevel || 5,
      supplierName: p.supplierName || '',
      expiryDate: p.expiryDate || '',
      description: p.description || ''
    });
    setProductModal(true);
  };

  // Open New Price Batch Modal
  const handleOpenNewBatch = async (sourceProduct) => {
    setBatchSource(sourceProduct);
    let newBarcode = `${sourceProduct.barcode}-1`;
    try {
      const res = await apiRequest('/products/barcode/generate');
      if (res.success && res.barcode) {
        newBarcode = res.barcode;
      }
    } catch (e) {
      console.warn('Barcode gen fallback:', e);
    }

    setBatchForm({
      name: `${sourceProduct.name} [New Price]`,
      sku: `${sourceProduct.sku}-N`,
      barcode: newBarcode,
      purchasePrice: sourceProduct.purchasePrice || '',
      sellingPrice: '',
      stock: '25',
      minStockLevel: sourceProduct.minStockLevel || '5',
      category: sourceProduct.category || 'General',
      brand: sourceProduct.brand || '',
      supplierName: sourceProduct.supplierName || ''
    });
    setBatchModal(true);
  };

  // Save New Price Batch Product & Optionally Print Labels
  const handleSaveBatch = async (printLabels = false) => {
    if (!batchForm.name || !batchForm.sellingPrice || !batchForm.barcode) {
      alert('Please fill in product name, selling price, and barcode');
      return;
    }
    const newPrice = parseFloat(batchForm.sellingPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Please enter a valid positive selling price');
      return;
    }

    try {
      const payload = {
        name: batchForm.name.trim(),
        sku: batchForm.sku.trim(),
        barcode: batchForm.barcode.trim(),
        category: batchForm.category,
        brand: batchForm.brand,
        supplierName: batchForm.supplierName,
        purchasePrice: parseFloat(batchForm.purchasePrice) || 0,
        sellingPrice: newPrice,
        wholesalePrice: newPrice,
        stock: parseInt(batchForm.stock, 10) || 0,
        minStockLevel: parseInt(batchForm.minStockLevel, 10) || 5,
        description: `New price batch derived from ${batchSource?.name || 'existing stock'}`
      };

      const res = await apiRequest('/products', {
        method: 'POST',
        body: payload
      });

      if (res.success) {
        setBatchModal(false);
        fetchInventory();

        if (printLabels) {
          sessionStorage.setItem('print_barcode_item', JSON.stringify({
            product: res.product,
            copies: parseInt(batchForm.stock, 10) || 1
          }));
          if (onNavigateTab) {
            onNavigateTab('barcodes');
          } else {
            alert(`New batch created! Please switch to Barcode Station to print labels.`);
          }
        } else {
          alert(`New price batch saved! Selling Price: Rs. ${newPrice}`);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to create new price batch');
    }
  };

  // Save product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: formData
        });
      }
      setProductModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Open Stock Adjustment
  const handleOpenAdjustment = (p) => {
    setSelectedForAdjustment(p);
    setAdjData({
      type: 'addition',
      quantity: '',
      reason: 'Damaged / Spoilage',
      notes: ''
    });
    setAdjustmentModal(true);
  };

  // Submit Stock Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: {
          productId: selectedForAdjustment.id,
          type: adjData.type,
          quantity: adjData.quantity,
          reason: adjData.reason,
          notes: adjData.notes
        }
      });
      setAdjustmentModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  // View Stock History
  const handleViewHistory = async (p) => {
    try {
      const res = await apiRequest(`/inventory/history/${p.id}`);
      if (res.success) {
        setStockHistory(res);
        setHistoryModal(true);
      }
    } catch (err) {
      alert('Could not retrieve stock movement history');
    }
  };

  // Open Physical Reconciliation Modal
  const handleOpenReconcile = () => {
    setReconcileList(products.map(p => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      systemStock: p.stock,
      physicalCount: p.stock
    })));
    setReconciliationModal(true);
  };

  // Submit Reconciliation
  const handleSubmitReconcile = async () => {
    try {
      await apiRequest('/inventory/reconcile', {
        method: 'POST',
        body: { items: reconcileList }
      });
      alert('Reconciliation batch applied successfully');
      setReconciliationModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to reconcile inventory');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Brand', 'PurchasePrice', 'SellingPrice', 'Stock', 'MinStock', 'Supplier'];
    const rows = products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.barcode}"`,
      `"${p.category}"`,
      `"${p.brand || ''}"`,
      p.purchasePrice,
      p.sellingPrice,
      p.stock,
      p.minStockLevel,
      `"${p.supplierName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DevLoop_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Bulk Import
  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      alert('CSV must contain a header and at least one data row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });

      rows.push({
        name: obj.name || obj.productname,
        sku: obj.sku,
        barcode: obj.barcode,
        category: obj.category,
        brand: obj.brand,
        purchasePrice: parseFloat(obj.purchaseprice || obj.cost || 0),
        sellingPrice: parseFloat(obj.sellingprice || obj.price || 0),
        stock: parseInt(obj.stock || 0, 10),
        minStockLevel: parseInt(obj.minstock || 5, 10),
        supplier: obj.supplier
      });
    }

    try {
      const res = await apiRequest('/inventory/bulk-import', {
        method: 'POST',
        body: { products: rows }
      });
      alert(res.message);
      setImportModal(false);
      setCsvText('');
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Import failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Metric Cards Banner */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</span>
            <h4 className="text-xl font-black text-slate-800 mt-1">{metrics.totalItems}</h4>
            <p className="text-[10px] text-slate-500">{metrics.totalStockUnits} total units</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost Valuation</span>
            <h4 className="text-lg font-black text-slate-800 mt-1">{formatCurrency(metrics.costValuation)}</h4>
            <p className="text-[10px] text-slate-500">Recorded purchase cost</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retail Potential</span>
            <h4 className="text-lg font-black text-sky-700 mt-1">{formatCurrency(metrics.retailValuation)}</h4>
            <p className="text-[10px] text-emerald-600 font-semibold">Margin: +{formatCurrency(metrics.potentialProfit)}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock</span>
            <h4 className="text-xl font-black text-amber-600 mt-1">{metrics.lowStockCount}</h4>
            <p className="text-[10px] text-amber-500">Requires reorder</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Out of Stock</span>
            <h4 className="text-xl font-black text-rose-600 mt-1">{metrics.outOfStockCount}</h4>
            <p className="text-[10px] text-rose-500">0 units left</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry Alert</span>
            <h4 className="text-xl font-black text-purple-600 mt-1">{metrics.expiredCount + metrics.expiringSoonCount}</h4>
            <p className="text-[10px] text-purple-500">{metrics.expiredCount} expired</p>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 text-slate-800"
              />
            </div>

            {/* Stock status tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl text-xs font-semibold">
              {['all', 'in', 'low', 'out', 'expired'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStockStatus(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition ${
                    stockStatus === st
                      ? 'bg-white text-slate-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'in' ? 'In Stock' : st === 'low' ? 'Low Stock' : st === 'out' ? 'Out' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Export inventory to CSV file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setImportModal(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Bulk import products from CSV"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleOpenReconcile}
              className="px-3 py-2 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Physical Stock Take & Reconciliation"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Reconcile</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Barcode / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading inventory catalog...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">No products match current filter</td>
                </tr>
              ) : (
                products.map((p) => {
                  const stock = Number(p.stock) || 0;
                  const isLow = stock > 0 && stock <= (Number(p.minStockLevel) || 5);
                  const isOut = stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                        {p.brand && <span className="text-[10px] text-slate-400">{p.brand}</span>}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-sky-700 font-semibold">{p.barcode}</div>
                        <div className="text-[10px] text-slate-400">{p.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-600">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                        {formatCurrency(p.purchasePrice)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.sellingPrice)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-sm text-slate-800">{stock}</span>
                        <span className="text-[10px] text-slate-400 ml-1">/ min {p.minStockLevel || 5}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewHistory(p)}
                            title="Stock Movement Ledger"
                            className="p-1.5 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenNewBatch(p)}
                            title="Create New Price Batch & Print Stickers"
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-sky-200/80 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5 text-sky-600" />
                            <span>New Price Batch</span>
                          </button>

                          <button
                            onClick={() => handleOpenAdjustment(p)}
                            title="Adjust Stock (+ / -)"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                          >
                            Adjust
                          </button>

                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1.5 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Delete"
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Product Details' : 'Register New Product'}
              </h3>
              <button onClick={() => setProductModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Elephant House Cream Soda 1.5L"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode (Code 128 / EAN-13)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or auto-generated"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Beverages, Snacks, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Brand name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Units</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Stock Warning Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    placeholder="Supplier or distributor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustmentModal && selectedForAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Adjust Stock Quantity</h3>
              <button onClick={() => setAdjustmentModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <p className="font-bold text-slate-800">{selectedForAdjustment.name}</p>
                <p className="text-slate-500 mt-0.5">Current Stock: <b className="text-sky-700">{selectedForAdjustment.stock} units</b></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Action</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'addition', label: '+ Add' },
                    { id: 'subtraction', label: '- Deduct' },
                    { id: 'set', label: '= Set Count' }
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAdjData({ ...adjData, type: a.id })}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        adjData.type === a.id
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjData.quantity}
                  onChange={(e) => setAdjData({ ...adjData, quantity: e.target.value })}
                  placeholder="Number of units"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Adjustment</label>
                <select
                  value={adjData.reason}
                  onChange={(e) => setAdjData({ ...adjData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Damaged / Spoilage">Damaged / Spoilage</option>
                  <option value="Inventory Count Correction">Inventory Count Correction</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Theft / Lost Stock">Theft / Lost Stock</option>
                  <option value="Expired Product">Expired Product</option>
                  <option value="Internal Store Use">Internal Store Use</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={adjData.notes}
                  onChange={(e) => setAdjData({ ...adjData, notes: e.target.value })}
                  placeholder="Additional context"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK HISTORY / LEDGER CARD MODAL */}
      {historyModal && stockHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">Stock Movement History</h3>
                <p className="text-xs text-sky-100">{stockHistory.product.name} (Current: {stockHistory.currentStock} units)</p>
              </div>
              <button onClick={() => setHistoryModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {stockHistory.history.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">No movements recorded yet</p>
                ) : (
                  stockHistory.history.map((h, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              h.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {h.type}
                          </span>
                          <span className="font-mono text-slate-500">{new Date(h.date).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 mt-1">{h.reference || h.notes}</p>
                        {h.user && <span className="text-[10px] text-slate-400">By: {h.user}</span>}
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-sm font-black ${h.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </span>
                        {h.newStock !== undefined && (
                          <p className="text-[10px] text-slate-400">Bal: {h.newStock}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHYSICAL RECONCILIATION MODAL */}
      {reconciliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">Physical Stock Reconciliation Count</h3>
                <p className="text-xs text-sky-100">Enter counted quantities to compute and resolve stock variances</p>
              </div>
              <button onClick={() => setReconciliationModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-center">System Stock</th>
                    <th className="pb-2 text-center">Physical Count</th>
                    <th className="pb-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconcileList.map((row, idx) => {
                    const diff = Number(row.physicalCount) - Number(row.systemStock);
                    return (
                      <tr key={row.productId} className="py-2">
                        <td className="py-2 font-medium">{row.name}</td>
                        <td className="py-2 text-center font-mono font-bold text-slate-600">{row.systemStock}</td>
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            value={row.physicalCount}
                            onChange={(e) => {
                              const updated = [...reconcileList];
                              updated[idx].physicalCount = parseInt(e.target.value, 10) || 0;
                              setReconcileList(updated);
                            }}
                            className="w-16 px-2 py-1 border rounded text-center font-mono font-bold bg-slate-50 focus:bg-white"
                          />
                        </td>
                        <td className="py-2 text-right font-mono font-bold">
                          <span className={diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setReconciliationModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReconcile}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Apply Reconciliation Adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Bulk Import Products (CSV)</h3>
              <button onClick={() => setImportModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600">
                Paste your CSV data below with header row: <br />
                <code className="text-[11px] bg-slate-100 p-1 rounded font-mono text-slate-700 block mt-1">
                  name,sku,barcode,category,brand,purchasePrice,sellingPrice,stock,minStock,supplier
                </code>
              </p>

              <textarea
                rows="8"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,sku,barcode,category,brand,purchasePrice,sellingPrice,stock,minStock,supplier&#10;Coca Cola 1.5L,BEV-003,890123450099,Beverages,Coca-Cola,300,360,40,10,Coke Distributors"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-sky-500"
              ></textarea>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCsvText('name,sku,barcode,category,brand,purchasePrice,sellingPrice,stock,minStock,supplier\nSprite 1.5L,BEV-010,890123450010,Beverages,Coca-Cola,310,370,50,15,Coke Distributors\nMunchi Super Cream Cracker 500g,BAK-011,890123450011,Bakery & Snacks,CBL,420,500,60,20,Ceylon Biscuits')}
                  className="text-xs font-semibold text-sky-600 hover:underline"
                >
                  Load Sample Template
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Upload & Process
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW PRICE BATCH MODAL */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-200" />
                <h3 className="font-bold text-base">New Price Batch & Stickers</h3>
              </div>
              <button onClick={() => setBatchModal(false)} className="text-white/80 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Context Box */}
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 space-y-1">
                <p className="font-bold text-sky-900 text-sm">
                  {batchSource?.name}
                </p>
                <div className="flex gap-4 text-slate-600 text-xs">
                  <span>Current Shelf Price: <strong className="text-slate-800">{formatCurrency(batchSource?.sellingPrice)}</strong></span>
                  <span>Old Stock Remaining: <strong className="text-slate-800">{batchSource?.stock} units</strong></span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Batch Display Name *</label>
                <input
                  type="text"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">New Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.sellingPrice}
                    onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: e.target.value })}
                    placeholder="e.g. 420"
                    className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl font-bold text-emerald-800 text-sm focus:outline-none focus:border-emerald-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Purchase Cost (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.purchasePrice}
                    onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                    placeholder="e.g. 350"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Received Quantity (Units) *</label>
                  <input
                    type="number"
                    value={batchForm.stock}
                    onChange={(e) => setBatchForm({ ...batchForm, stock: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Batch SKU</label>
                  <input
                    type="text"
                    value={batchForm.sku}
                    onChange={(e) => setBatchForm({ ...batchForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Sticker Barcode *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={batchForm.barcode}
                    onChange={(e) => setBatchForm({ ...batchForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await apiRequest('/products/barcode/generate');
                        if (res.success) setBatchForm({ ...batchForm, barcode: res.barcode });
                      } catch (e) {}
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Stick this barcode label on incoming new-price packets so cashiers scan the exact new price!
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBatch(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Save Batch
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBatch(true)}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Save & Print Labels ({batchForm.stock || 0})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
