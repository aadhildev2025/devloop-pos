import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CreditCard,
  Banknote,
  Building,
  Clock,
  RotateCcw,
  Pause,
  Play,
  CheckCircle,
  AlertCircle,
  Edit2,
  Percent,
  X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SupervisorPinModal from '../components/SupervisorPinModal';
import ReceiptModal from '../components/ReceiptModal';

export default function POS() {
  const { user, settings, formatCurrency } = useAuth();

  // Catalog state
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percentage'
  const [discountValue, setDiscountValue] = useState(0);

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quickCustomerModal, setQuickCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Checkout modal state
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'card' | 'bank_transfer' | 'credit' | 'split'
  const [amountReceived, setAmountReceived] = useState('');
  const [splitPayments, setSplitPayments] = useState([
    { method: 'cash', amount: 0 },
    { method: 'card', amount: 0 }
  ]);

  // Held Carts
  const [heldCarts, setHeldCarts] = useState([]);
  const [heldCartsModal, setHeldCartsModal] = useState(false);

  // Supervisor PIN & Stock Overrides
  const [supervisorModal, setSupervisorModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type, data }
  const [priceEditItem, setPriceEditItem] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');

  // Refund / Return Modal
  const [refundModal, setRefundModal] = useState(false);
  const [refundInvoiceNo, setRefundInvoiceNo] = useState('');
  const [refundSale, setRefundSale] = useState(null);
  const [refundItems, setRefundItems] = useState([]);
  const [refundReason, setRefundReason] = useState('');

  // Completed Receipt Modal
  const [completedSale, setCompletedSale] = useState(null);

  const barcodeInputRef = useRef(null);

  // Load catalog & customers
  const loadData = async () => {
    try {
      const [prodRes, custRes, heldRes] = await Promise.all([
        apiRequest('/products'),
        apiRequest('/customers'),
        apiRequest('/pos/held')
      ]);

      if (prodRes.success) {
        setProducts(prodRes.products);
        setFilteredProducts(prodRes.products);
        const cats = Array.from(new Set(prodRes.products.map(p => p.category).filter(Boolean)));
        setCategories(cats);
      }
      if (custRes.success) {
        setCustomers(custRes.customers);
      }
      if (heldRes.success) {
        setHeldCarts(heldRes.heldSales);
      }
    } catch (err) {
      console.error('POS load error:', err);
    }
  };

  useEffect(() => {
    loadData();
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Filter products by category & search
  useEffect(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        String(p.barcode).toLowerCase().includes(q)
      );
    }
    setFilteredProducts(list);
  }, [selectedCategory, searchQuery, products]);

  // Keyboard shortcut listener (F2: barcode, F4: customer, F8: pay, F9: hold, Esc: clear)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) openCheckout();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) handleHoldCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Add product to cart by product object
  const addToCart = (product) => {
    const existingIndex = cart.findIndex(item => item.productId === product.id);

    if (existingIndex > -1) {
      // Increment quantity
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;

      // Check stock
      if (newQty > product.stock) {
        if (!confirm(`Warning: Only ${product.stock} units available in stock. Override with supervisor approval?`)) {
          return;
        }
      }

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = (updated[existingIndex].unitPrice * newQty) - updated[existingIndex].discount;
      setCart(updated);
    } else {
      // Check stock
      if (product.stock <= 0) {
        if (!confirm(`Product "${product.name}" is currently OUT OF STOCK. Add anyway with supervisor override?`)) {
          return;
        }
      }

      setCart([
        ...cart,
        {
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          unitCost: product.purchasePrice,
          unitPrice: product.sellingPrice,
          quantity: 1,
          discount: 0,
          total: product.sellingPrice,
          availableStock: product.stock
        }
      ]);
    }
  };

  // Handle USB scanner / Manual Barcode Enter
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    setBarcodeInput('');

    // First check local catalog
    const localMatch = products.find(
      p => String(p.barcode).trim() === code || p.sku.toLowerCase() === code.toLowerCase()
    );

    if (localMatch) {
      addToCart(localMatch);
      return;
    }

    // Try server lookup
    try {
      const res = await apiRequest(`/products/barcode/${encodeURIComponent(code)}`);
      if (res.success && res.product) {
        addToCart(res.product);
      } else {
        alert(`Barcode "${code}" not found in system. Please register it in Inventory.`);
      }
    } catch (err) {
      alert(`No product matching barcode "${code}"`);
    }
  };

  // Update item quantity
  const updateQuantity = (index, delta) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;

    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].total = (updated[index].unitPrice * newQty) - updated[index].discount;
    }
    setCart(updated);
  };

  const setItemQuantity = (index, val) => {
    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty <= 0) return;
    const updated = [...cart];
    updated[index].quantity = qty;
    updated[index].total = (updated[index].unitPrice * qty) - updated[index].discount;
    setCart(updated);
  };

  const removeItem = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  // Price Override with supervisor verification
  const handleRequestPriceEdit = (item, index) => {
    setPriceEditItem({ ...item, index });
    setNewPriceValue(item.unitPrice);

    // If user is admin/manager, directly open edit modal, otherwise require PIN first
    if (user.role === 'admin' || user.role === 'manager') {
      // proceed directly
    } else {
      setPendingAction({ type: 'PRICE_EDIT', item, index });
      setSupervisorModal(true);
    }
  };

  const applyPriceEdit = () => {
    if (!priceEditItem || !newPriceValue) return;
    const val = parseFloat(newPriceValue);
    if (isNaN(val) || val < 0) return;

    const updated = [...cart];
    updated[priceEditItem.index].unitPrice = val;
    updated[priceEditItem.index].total = (val * updated[priceEditItem.index].quantity) - updated[priceEditItem.index].discount;
    setCart(updated);
    setPriceEditItem(null);
  };

  // Financial Calculations
  const subtotal = cart.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  let discountTotal = 0;
  if (discountType === 'percentage') {
    discountTotal = (subtotal * (parseFloat(discountValue) || 0)) / 100;
  } else {
    discountTotal = parseFloat(discountValue) || 0;
  }
  discountTotal = Math.min(subtotal, Math.max(0, discountTotal));

  const discountedSubtotal = subtotal - discountTotal;
  const taxRate = settings.taxEnabled ? (parseFloat(settings.taxRate) || 0) : 0;
  const taxTotal = (discountedSubtotal * taxRate) / 100;
  const grandTotal = Math.round((discountedSubtotal + taxTotal) * 100) / 100;

  // Open Checkout Modal
  const openCheckout = () => {
    if (cart.length === 0) return;
    setAmountReceived(grandTotal);
    setCheckoutModal(true);
  };

  // Submit Final Checkout
  const handleFinalCheckout = async () => {
    try {
      const selectedCust = customers.find(c => c.id === selectedCustomerId);

      const payload = {
        customerId: selectedCustomerId || null,
        customerName: selectedCust ? selectedCust.name : 'Walk-in Customer',
        customerPhone: selectedCust ? selectedCust.phone : '',
        items: cart,
        discountType,
        discountValue,
        taxPercent: taxRate,
        paymentType,
        amountReceived: parseFloat(amountReceived) || grandTotal,
        payments: paymentType === 'split' ? splitPayments : [
          { method: paymentType, amount: parseFloat(amountReceived) || grandTotal, reference: '' }
        ],
        allowStockOverride: true
      };

      const res = await apiRequest('/pos/sale', {
        method: 'POST',
        body: payload
      });

      if (res.success) {
        setCompletedSale(res.sale);
        setCheckoutModal(false);
        setCart([]);
        setDiscountValue(0);
        setSelectedCustomerId('');
        loadData(); // reload stock counts
      }
    } catch (err) {
      alert(err.message || 'Checkout failed');
    }
  };

  // Quick Customer Create
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerName) return;

    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: {
          name: newCustomerName,
          phone: newCustomerPhone,
          creditLimit: 25000
        }
      });

      if (res.success) {
        setCustomers(prev => [...prev, res.customer]);
        setSelectedCustomerId(res.customer.id);
        setQuickCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
      }
    } catch (err) {
      alert(err.message || 'Failed to add customer');
    }
  };

  // Hold active cart
  const handleHoldCart = async () => {
    if (cart.length === 0) return;
    const ref = prompt('Enter a label or customer name for this held cart:', `Cart #${heldCarts.length + 1}`);
    if (ref === null) return;

    try {
      const res = await apiRequest('/pos/hold', {
        method: 'POST',
        body: {
          reference: ref || `Held Cart`,
          items: cart,
          customer: selectedCustomerId,
          discount: { type: discountType, value: discountValue }
        }
      });

      if (res.success) {
        setCart([]);
        setSelectedCustomerId('');
        setDiscountValue(0);
        loadData();
      }
    } catch (err) {
      alert('Could not hold cart');
    }
  };

  // Resume held cart
  const handleResumeCart = (held) => {
    setCart(held.items || []);
    if (held.customer) setSelectedCustomerId(held.customer);
    if (held.discount) {
      setDiscountType(held.discount.type || 'fixed');
      setDiscountValue(held.discount.value || 0);
    }
    // Delete from held backend
    apiRequest(`/pos/held/${held.id}`, { method: 'DELETE' });
    setHeldCarts(prev => prev.filter(h => h.id !== held.id));
    setHeldCartsModal(false);
  };

  // Search invoice for refund
  const handleSearchRefundInvoice = async () => {
    if (!refundInvoiceNo.trim()) return;
    try {
      const res = await apiRequest(`/pos/invoice/${refundInvoiceNo.trim()}`);
      if (res.success && res.sale) {
        setRefundSale(res.sale);
        setRefundItems(res.sale.items.map(it => ({ ...it, returnQty: 0 })));
      }
    } catch (err) {
      alert('Invoice not found: ' + refundInvoiceNo);
    }
  };

  // Submit refund
  const submitRefund = async () => {
    const itemsToReturn = refundItems
      .filter(it => it.returnQty > 0)
      .map(it => ({
        productId: it.productId,
        name: it.name,
        quantity: it.returnQty
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least 1 item to return');
      return;
    }

    try {
      const res = await apiRequest(`/pos/refund/${refundSale.invoiceNumber}`, {
        method: 'POST',
        body: {
          returnItems: itemsToReturn,
          reason: refundReason
        }
      });

      if (res.success) {
        alert(res.message);
        setRefundModal(false);
        setRefundSale(null);
        setRefundItems([]);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Refund failed');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100">
      {/* LEFT SECTION: Barcode Scanner & Product Catalog */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
        {/* Top Scanner / Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-sky-100 flex items-center gap-3">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-600">
              <Barcode className="w-5 h-5" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type & press Enter (F2)..."
              className="w-full pl-11 pr-4 py-2.5 bg-sky-50/50 border border-sky-200/80 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder-slate-400"
            />
          </form>

          <div className="w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name / SKU..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
            />
          </div>

          {/* Refund Trigger */}
          <button
            onClick={() => setRefundModal(true)}
            className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            title="Return / Refund previous invoice"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refund</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map((p) => {
              const inStock = Number(p.stock) > 0;
              const isLow = inStock && Number(p.stock) <= (Number(p.minStockLevel) || 5);

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`bg-white p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between hover:shadow-md hover:border-sky-300 group ${
                    !inStock
                      ? 'border-rose-200 bg-rose-50/30 opacity-75'
                      : isLow
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold truncate">{p.sku}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          !inStock
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {inStock ? `${p.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug group-hover:text-sky-700 transition">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-sky-700 font-mono">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Cart, Customer & Checkout Panel */}
      <div className="w-96 2xl:w-[26rem] bg-white border-l border-sky-100 flex flex-col h-full shadow-lg">
        {/* Customer Select Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <div className="flex-1">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="">Walk-in Customer (General)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} {c.currentBalance > 0 ? `[Debt: Rs.${c.currentBalance}]` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setQuickCustomerModal(true)}
            title="Register new customer"
            className="p-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-xl transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Item Header Bar */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span>Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          {heldCarts.length > 0 && (
            <button
              onClick={() => setHeldCartsModal(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline"
            >
              <Pause className="w-3 h-3" />
              <span>{heldCarts.length} Held</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Barcode className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-600">Cart is Empty</p>
              <p className="text-[11px] text-slate-400 mt-1">Scan a barcode or click products to begin billing</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="py-2.5 px-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">{item.name}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                      <button
                        onClick={() => handleRequestPriceEdit(item, index)}
                        className="text-[10px] font-semibold text-sky-600 hover:underline flex items-center gap-0.5"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Rs.{Number(item.unitPrice).toFixed(2)}</span>
                      </button>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-600 hover:bg-slate-200 flex items-center justify-center transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setItemQuantity(index, e.target.value)}
                      className="w-10 text-center font-bold text-xs bg-transparent focus:outline-none"
                    />
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-600 hover:bg-slate-200 flex items-center justify-center transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Discounts Section */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-semibold font-mono">{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount input */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Discount:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDiscountType(discountType === 'fixed' ? 'percentage' : 'fixed')}
                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
              >
                {discountType === 'fixed' ? 'Rs' : '%'}
              </button>
              <input
                type="number"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-right text-xs font-mono font-bold"
              />
              <span className="font-mono text-emerald-600 font-bold">
                -{formatCurrency(discountTotal)}
              </span>
            </div>
          </div>

          {/* Tax line */}
          {settings.taxEnabled && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({taxRate}%):</span>
              <span className="font-mono font-semibold">+{formatCurrency(taxTotal)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-800">Grand Total:</span>
            <span className="text-xl font-black text-sky-700 font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Action Buttons: Hold, Clear, Pay */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Hold (F9)</span>
            </button>

            <button
              onClick={() => { if (confirm('Clear entire cart?')) setCart([]); }}
              disabled={cart.length === 0}
              className="py-2.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <button
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-sky-600/25 transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40"
          >
            <Banknote className="w-5 h-5" />
            <span>CHECKOUT & PAY (F8)</span>
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-sky-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-lg">Complete Checkout</h3>
                <p className="text-xs text-sky-100 font-mono">Invoice Total: {formatCurrency(grandTotal)}</p>
              </div>
              <button
                onClick={() => setCheckoutModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'bank_transfer', label: 'Bank', icon: Building },
                    { id: 'credit', label: 'Credit (Debt)', icon: Clock }
                  ].map(m => {
                    const Icon = m.icon;
                    const isSel = paymentType === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentType(m.id);
                          if (m.id === 'credit') setAmountReceived(0);
                          else setAmountReceived(grandTotal);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                          isSel
                            ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Received & Quick buttons */}
              {paymentType === 'cash' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Cash Received</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter cash received"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />

                  {/* Quick cash denomination chips in LKR */}
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {[grandTotal, 500, 1000, 2000, 5000].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountReceived(amt)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-100 hover:text-sky-800 text-slate-700 rounded-lg text-xs font-mono font-bold transition shrink-0"
                      >
                        {idx === 0 ? 'Exact' : `Rs. ${amt}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  <div className="p-3 bg-sky-50/70 border border-sky-200/60 rounded-xl flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-sky-900">Change Due:</span>
                    <span className="text-base font-black text-sky-700 font-mono">
                      {formatCurrency(Math.max(0, (parseFloat(amountReceived) || 0) - grandTotal))}
                    </span>
                  </div>
                </div>
              )}

              {/* Credit Sale Warning */}
              {paymentType === 'credit' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                  <p className="font-bold">⚠️ Customer Credit Sale</p>
                  <p>
                    This will add <b>{formatCurrency(grandTotal)}</b> to the customer's outstanding debt balance.
                  </p>
                  {!selectedCustomerId && (
                    <p className="text-rose-600 font-bold">
                      Please select a registered customer first!
                    </p>
                  )}
                </div>
              )}

              {/* Submit Final Checkout Button */}
              <button
                type="button"
                onClick={handleFinalCheckout}
                disabled={paymentType === 'credit' && !selectedCustomerId}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-40"
              >
                Confirm Sale & Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      {quickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-sky-100">
            <h3 className="font-bold text-base text-slate-800 mb-3">Quick Register Customer</h3>
            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE EDIT MODAL */}
      {priceEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-5 border border-sky-100">
            <h3 className="font-bold text-sm text-slate-800 mb-1">Override Item Price</h3>
            <p className="text-xs text-slate-500 mb-3">{priceEditItem.name}</p>
            <input
              type="number"
              value={newPriceValue}
              onChange={(e) => setNewPriceValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPriceEditItem(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={applyPriceEdit}
                className="flex-1 py-2 bg-sky-600 text-white font-semibold rounded-xl text-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD CARTS MODAL */}
      {heldCartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-sky-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">Held Carts</h3>
              <button onClick={() => setHeldCartsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {heldCarts.map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">{h.reference}</h5>
                    <p className="text-[11px] text-slate-500">
                      {(h.items || []).length} items • {new Date(h.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResumeCart(h)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-sky-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Invoice Return & Refund</span>
              </h3>
              <button onClick={() => setRefundModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={refundInvoiceNo}
                onChange={(e) => setRefundInvoiceNo(e.target.value)}
                placeholder="Enter Invoice # (e.g. INV-20261026-0001)"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
              <button
                onClick={handleSearchRefundInvoice}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
              >
                Search
              </button>
            </div>

            {refundSale && (
              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs flex justify-between">
                  <span>Customer: <b>{refundSale.customerName}</b></span>
                  <span>Total: <b>{formatCurrency(refundSale.grandTotal)}</b></span>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {refundItems.map((it, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{it.name}</p>
                        <p className="text-[10px] text-slate-400">Sold: {it.quantity} @ Rs.{it.unitPrice}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={it.quantity}
                          value={it.returnQty}
                          onChange={(e) => {
                            const val = Math.min(it.quantity, Math.max(0, parseInt(e.target.value, 10) || 0));
                            const updated = [...refundItems];
                            updated[idx].returnQty = val;
                            setRefundItems(updated);
                          }}
                          className="w-12 text-center p-1 border rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for return / refund..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />

                <button
                  onClick={submitRefund}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Process Refund & Restore Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supervisor Pin Authorization Modal */}
      <SupervisorPinModal
        isOpen={supervisorModal}
        onClose={() => setSupervisorModal(false)}
        onSuccess={(pin, supervisor) => {
          if (pendingAction?.type === 'PRICE_EDIT') {
            setPriceEditItem({ ...pendingAction.item, index: pendingAction.index });
            setNewPriceValue(pendingAction.item.unitPrice);
          }
        }}
      />

      {/* Thermal Receipt Print Modal */}
      {completedSale && (
        <ReceiptModal
          isOpen={Boolean(completedSale)}
          onClose={() => setCompletedSale(null)}
          sale={completedSale}
        />
      )}
    </div>
  );
}
