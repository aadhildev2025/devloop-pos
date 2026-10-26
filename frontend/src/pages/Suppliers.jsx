import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  DollarSign,
  PackagePlus,
  Printer,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Suppliers() {
  const { formatCurrency, settings } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'suppliers' | 'purchases'
  const [activeTab, setActiveTab] = useState('suppliers');

  // Modals
  const [supplierModal, setSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [statementModal, setStatementModal] = useState(false);
  const [statementData, setStatementData] = useState(null);

  // Supplier Form
  const [supFormData, setSupFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
    supplierCode: '',
    outstandingBalance: '0'
  });

  // Purchase GRN Form
  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    supplierInvoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    discount: '0',
    additionalCharges: '0',
    paymentType: 'credit',
    amountPaid: '0',
    receivedStatus: 'received',
    notes: '',
    items: []
  });

  // Item row being added in purchase
  const [itemRow, setItemRow] = useState({
    productId: '',
    isNewProduct: false,
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    unitCost: '',
    sellingPrice: '',
    quantity: '1'
  });

  // Supplier Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, purRes, prodRes] = await Promise.all([
        apiRequest(`/suppliers?search=${encodeURIComponent(search)}`),
        apiRequest('/suppliers/purchases/list'),
        apiRequest('/products')
      ]);

      if (supRes.success) setSuppliers(supRes.suppliers);
      if (purRes.success) setPurchases(purRes.purchases);
      if (prodRes.success) setProducts(prodRes.products);
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // Open Add Supplier
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupFormData({
      name: '',
      businessName: '',
      phone: '',
      email: '',
      address: '',
      supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
      outstandingBalance: '0'
    });
    setSupplierModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await apiRequest(`/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: supFormData
        });
      } else {
        await apiRequest('/suppliers', {
          method: 'POST',
          body: supFormData
        });
      }
      setSupplierModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save supplier');
    }
  };

  // Open New Purchase GRN
  const handleOpenNewPurchase = () => {
    setPurchaseData({
      supplierId: suppliers[0]?.id || '',
      supplierInvoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
      purchaseDate: new Date().toISOString().split('T')[0],
      discount: '0',
      additionalCharges: '0',
      paymentType: 'credit',
      amountPaid: '0',
      receivedStatus: 'received',
      notes: '',
      items: []
    });
    setPurchaseModal(true);
  };

  // Add Item to Purchase list
  const handleAddItemToPurchase = () => {
    if (itemRow.isNewProduct) {
      if (!itemRow.name || !itemRow.unitCost) {
        alert('Product name and purchase unit cost are required');
        return;
      }
      setPurchaseData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            ...itemRow,
            unitCost: parseFloat(itemRow.unitCost),
            sellingPrice: parseFloat(itemRow.sellingPrice || itemRow.unitCost * 1.25),
            quantity: parseInt(itemRow.quantity, 10) || 1
          }
        ]
      }));
    } else {
      const prod = products.find(p => p.id === itemRow.productId);
      if (!prod) {
        alert('Please select a product');
        return;
      }
      setPurchaseData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            productId: prod.id,
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            unitCost: parseFloat(itemRow.unitCost || prod.purchasePrice),
            sellingPrice: prod.sellingPrice,
            quantity: parseInt(itemRow.quantity, 10) || 1,
            isNewProduct: false
          }
        ]
      }));
    }

    // Reset item row
    setItemRow({
      productId: '',
      isNewProduct: false,
      name: '',
      sku: '',
      barcode: '',
      category: 'General',
      unitCost: '',
      sellingPrice: '',
      quantity: '1'
    });
  };

  const handleRemovePurchaseItem = (idx) => {
    const updated = [...purchaseData.items];
    updated.splice(idx, 1);
    setPurchaseData({ ...purchaseData, items: updated });
  };

  // Calculate purchase totals
  const purchaseSubtotal = purchaseData.items.reduce((sum, it) => sum + (it.unitCost * it.quantity), 0);
  const purchaseGrandTotal = Math.max(
    0,
    purchaseSubtotal - (parseFloat(purchaseData.discount) || 0) + (parseFloat(purchaseData.additionalCharges) || 0)
  );

  // Submit Purchase
  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (purchaseData.items.length === 0) {
      alert('Add at least one product to the purchase order');
      return;
    }

    try {
      const res = await apiRequest('/suppliers/purchases', {
        method: 'POST',
        body: purchaseData
      });

      if (res.success) {
        alert(res.message);
        setPurchaseModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to record purchase');
    }
  };

  // Open Payment to Supplier Modal
  const handleOpenPayment = (s) => {
    setSelectedForPayment(s);
    setPaymentForm({
      amount: s.outstandingBalance,
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: ''
    });
    setPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/suppliers/${selectedForPayment.id}/payment`, {
        method: 'POST',
        body: paymentForm
      });
      if (res.success) {
        alert(res.message);
        setPaymentModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to record supplier payment');
    }
  };

  // View Supplier Statement
  const handleViewStatement = async (s) => {
    try {
      const res = await apiRequest(`/suppliers/${s.id}/statement`);
      if (res.success) {
        setStatementData(res);
        setStatementModal(true);
      }
    } catch (err) {
      alert('Failed to retrieve supplier statement');
    }
  };

  const totalOwed = suppliers.reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Payables Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Suppliers</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{suppliers.length}</h3>
          <p className="text-xs text-slate-500">Registered vendors & distributors</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Supplier Payables</span>
          <h3 className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(totalOwed)}</h3>
          <p className="text-xs text-amber-500 font-semibold">Money currently owed to suppliers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Goods Receiving</span>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleOpenNewPurchase}
              className="w-full py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <PackagePlus className="w-4 h-4" />
              <span>New Purchase (GRN)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'suppliers'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'purchases'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Purchase Orders / Invoices ({purchases.length})
            </button>
          </div>

          {activeTab === 'suppliers' ? (
            <div className="flex items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search suppliers..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
              <button
                onClick={handleOpenAddSupplier}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenNewPurchase}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Record Purchase</span>
            </button>
          )}
        </div>

        {/* Tab 1: Suppliers Directory Table */}
        {activeTab === 'suppliers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Supplier & Business Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No suppliers registered</td>
                  </tr>
                ) : (
                  suppliers.map((s) => {
                    const balance = Number(s.outstandingBalance) || 0;
                    return (
                      <tr key={s.id} className="hover:bg-sky-50/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.businessName} • {s.supplierCode}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">
                          {s.phone || '-'}
                        </td>

                        <td className="py-3 px-4 text-slate-500">
                          {s.address || '-'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-sm">
                          <span className={balance > 0 ? 'text-amber-600' : 'text-slate-400'}>
                            {formatCurrency(balance)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {balance > 0 && (
                              <button
                                onClick={() => handleOpenPayment(s)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                Pay Supplier
                              </button>
                            )}

                            <button
                              onClick={() => handleViewStatement(s)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              Statement
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
        )}

        {/* Tab 2: Purchase Invoices Table */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Purchase Ref</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No purchases recorded yet</td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">
                        <div>{p.purchaseNumber}</div>
                        {p.supplierInvoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-normal">Inv: {p.supplierInvoiceNumber}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {p.supplierName}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500">
                        {p.purchaseDate}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-600">
                        {(p.items || []).length} items
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.grandTotal)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : p.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          {p.receivedStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW PURCHASE / GRN MODAL */}
      {purchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">New Purchase Order / Goods Received (GRN)</h3>
                <p className="text-xs text-sky-100">Automatically increases inventory stock upon completion</p>
              </div>
              <button onClick={() => setPurchaseModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {/* Supplier & Invoice Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={purchaseData.supplierId}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.businessName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Bill / Invoice #</label>
                  <input
                    type="text"
                    value={purchaseData.supplierInvoiceNumber}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierInvoiceNumber: e.target.value })}
                    placeholder="e.g. INV-98765"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseData.purchaseDate}
                    onChange={(e) => setPurchaseData({ ...purchaseData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Add Item Bar inside Purchase */}
              <div className="p-3 bg-sky-50/70 rounded-2xl border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">Add Items to Purchase</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemRow.isNewProduct}
                      onChange={(e) => setItemRow({ ...itemRow, isNewProduct: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span>Register New Product on the Fly</span>
                  </label>
                </div>

                {itemRow.isNewProduct ? (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="New Product Name"
                        value={itemRow.name}
                        onChange={(e) => setItemRow({ ...itemRow, name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Unit Cost (Rs.)"
                        value={itemRow.unitCost}
                        onChange={(e) => setItemRow({ ...itemRow, unitCost: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Selling Price"
                        value={itemRow.sellingPrice}
                        onChange={(e) => setItemRow({ ...itemRow, sellingPrice: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <select
                        value={itemRow.productId}
                        onChange={(e) => {
                          const p = products.find(prod => prod.id === e.target.value);
                          setItemRow({
                            ...itemRow,
                            productId: e.target.value,
                            unitCost: p ? p.purchasePrice : ''
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        <option value="">-- Select Existing Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} [{p.sku}]</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Unit Cost (Rs.)"
                        value={itemRow.unitCost}
                        onChange={(e) => setItemRow({ ...itemRow, unitCost: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={itemRow.quantity}
                        onChange={(e) => setItemRow({ ...itemRow, quantity: e.target.value })}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={handleAddItemToPurchase}
                        className="flex-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table in Modal */}
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Cost</th>
                      <th className="p-2 text-right">Line Total</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {purchaseData.items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-400 font-sans">No items added yet</td>
                      </tr>
                    ) : (
                      purchaseData.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-sans font-medium">{it.name}</td>
                          <td className="p-2 text-center font-bold">{it.quantity}</td>
                          <td className="p-2 text-right">{Number(it.unitCost).toFixed(2)}</td>
                          <td className="p-2 text-right font-bold">{(it.unitCost * it.quantity).toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePurchaseItem(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial calculations */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500">Subtotal:</span>
                  <div className="font-mono font-bold text-sm text-slate-800">{formatCurrency(purchaseSubtotal)}</div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-0.5">Discount (Rs.):</label>
                  <input
                    type="number"
                    value={purchaseData.discount}
                    onChange={(e) => setPurchaseData({ ...purchaseData, discount: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-500">Grand Total:</span>
                  <div className="font-mono font-black text-sm text-sky-700">{formatCurrency(purchaseGrandTotal)}</div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={purchaseData.paymentType}
                    onChange={(e) => setPurchaseData({ ...purchaseData, paymentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="credit">Supplier Credit (Pay Later)</option>
                    <option value="cash">Paid in Cash</option>
                    <option value="bank_transfer">Paid via Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid Now (Rs.)</label>
                  <input
                    type="number"
                    value={purchaseData.amountPaid}
                    onChange={(e) => setPurchaseData({ ...purchaseData, amountPaid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPurchaseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PAYMENT MODAL */}
      {paymentModal && selectedForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Record Supplier Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <p className="font-bold text-slate-800">{selectedForPayment.name}</p>
                <p className="text-slate-500 mt-0.5">
                  Outstanding Balance: <b className="text-amber-600">{formatCurrency(selectedForPayment.outstandingBalance)}</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedForPayment.outstandingBalance}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="bank_transfer">Bank Transfer / Online</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Reference / Cheque #</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER STATEMENT MODAL */}
      {statementModal && statementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">Supplier Account Statement</h3>
                <p className="text-xs text-sky-100">{statementData.supplier.name} • {statementData.supplier.supplierCode}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-white text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setStatementModal(false)} className="text-white/80 hover:text-white">✕</button>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between mb-4 border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Current Balance Owed to Supplier:</span>
                <span className="text-base font-black text-amber-600 font-mono">
                  {formatCurrency(statementData.currentBalance)}
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type / Ref</th>
                    <th className="pb-2 text-right">Debit (We Paid)</th>
                    <th className="pb-2 text-right">Credit (Purchased)</th>
                    <th className="pb-2 text-right">Running Owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {statementData.ledger.map((row, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2 text-[11px] font-sans">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-2 font-sans font-semibold">
                        <div>{row.type}: {row.reference}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{row.notes}</div>
                      </td>
                      <td className="py-2 text-right text-emerald-600">{row.debit > 0 ? Number(row.debit).toFixed(2) : '-'}</td>
                      <td className="py-2 text-right text-amber-600">{row.credit > 0 ? Number(row.credit).toFixed(2) : '-'}</td>
                      <td className="py-2 text-right font-bold text-slate-800">{Number(row.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
