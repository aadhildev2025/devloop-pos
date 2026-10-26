import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  FileText,
  MessageCircle,
  Clock,
  Printer,
  X,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Customers() {
  const { formatCurrency, settings } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [hasDebtOnly, setHasDebtOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [statementModal, setStatementModal] = useState(false);
  const [statementData, setStatementData] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    customerCode: '',
    phone: '',
    address: '',
    creditLimit: '30000',
    currentBalance: '0'
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    notes: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/customers?search=${encodeURIComponent(search)}&hasDebt=${hasDebtOnly}`);
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, hasDebtOnly]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      customerCode: `CUST-${Date.now().toString().slice(-4)}`,
      phone: '',
      address: '',
      creditLimit: '30000',
      currentBalance: '0'
    });
    setCustomerModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      customerCode: c.customerCode,
      phone: c.phone,
      address: c.address,
      creditLimit: c.creditLimit || 0,
      currentBalance: c.currentBalance || 0
    });
    setCustomerModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await apiRequest(`/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        await apiRequest('/customers', {
          method: 'POST',
          body: formData
        });
      }
      setCustomerModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  // Open Payment Collection Modal
  const handleOpenPayment = (c) => {
    setSelectedForPayment(c);
    setPaymentData({
      amount: c.currentBalance,
      paymentMethod: 'cash',
      reference: '',
      notes: ''
    });
    setPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/customers/${selectedForPayment.id}/payment`, {
        method: 'POST',
        body: paymentData
      });
      if (res.success) {
        alert(res.message);
        setPaymentModal(false);
        fetchCustomers();
      }
    } catch (err) {
      alert(err.message || 'Payment collection failed');
    }
  };

  // View Statement
  const handleViewStatement = async (c) => {
    try {
      const res = await apiRequest(`/customers/${c.id}/statement`);
      if (res.success) {
        setStatementData(res);
        setStatementModal(true);
      }
    } catch (err) {
      alert('Could not generate statement');
    }
  };

  // WhatsApp Reminder Link
  const handleWhatsAppReminder = (c) => {
    if (!c.phone) {
      alert('Customer has no phone number recorded');
      return;
    }
    // Clean phone number (strip spaces/dashes)
    let phone = c.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1); // Format for Sri Lanka
    }

    const message = encodeURIComponent(
      `Dear ${c.name},\nThis is a friendly reminder from ${settings.shopName || 'DevLoop Supermarket'}.\nYour current outstanding balance is ${formatCurrency(c.currentBalance)}.\nPlease arrange payment at your earliest convenience.\nThank you!`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.currentBalance) || 0), 0);
  const debtorCount = customers.filter(c => Number(c.currentBalance) > 0).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Receivables Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Customers</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{customers.length}</h3>
          <p className="text-xs text-slate-500">Registered store accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Outstanding Debts</span>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalOutstanding)}</h3>
          <p className="text-xs text-rose-500 font-semibold">{debtorCount} customers with unpaid debt</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Filter</span>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setHasDebtOnly(!hasDebtOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                hasDebtOnly
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{hasDebtOnly ? 'Showing Debts Only' : 'Show Outstanding Debts Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, phone, or code..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 text-slate-800"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Customer</span>
          </button>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Debt</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No customers found</td>
                </tr>
              ) : (
                customers.map((c) => {
                  const debt = Number(c.currentBalance) || 0;
                  const limit = Number(c.creditLimit) || 0;
                  const isExceeded = limit > 0 && debt > limit;

                  return (
                    <tr key={c.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{c.customerCode} • {c.address || 'No address'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {c.phone || '-'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-500">
                        {limit > 0 ? formatCurrency(limit) : 'No Limit'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-sm">
                        <span className={debt > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrency(debt)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            debt === 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : isExceeded
                              ? 'bg-rose-100 text-rose-700 animate-pulse'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {debt === 0 ? 'Clear' : isExceeded ? 'Limit Exceeded' : 'Pending Debt'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {debt > 0 && (
                            <>
                              <button
                                onClick={() => handleWhatsAppReminder(c)}
                                title="Send WhatsApp Payment Reminder"
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenPayment(c)}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                Collect Pay
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleViewStatement(c)}
                            title="Statement & Purchase Ledger"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            Statement
                          </button>

                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 transition"
                          >
                            Edit
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

      {/* ADD / EDIT CUSTOMER MODAL */}
      {customerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">
                {editingCustomer ? 'Update Customer Details' : 'Register Customer'}
              </h3>
              <button onClick={() => setCustomerModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kasun Rathnayake"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Code</label>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="077xxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Area"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                {!editingCustomer && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Balance Debt</label>
                    <input
                      type="number"
                      value={formData.currentBalance}
                      onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT DEBT PAYMENT MODAL */}
      {paymentModal && selectedForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Collect Debt Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <p className="font-bold text-slate-800">{selectedForPayment.name}</p>
                <p className="text-slate-500 mt-0.5">
                  Current Debt: <b className="text-rose-600">{formatCurrency(selectedForPayment.currentBalance)}</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedForPayment.currentBalance}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer / Online</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="Optional bank ref"
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
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER STATEMENT MODAL */}
      {statementModal && statementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-sky-100 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-base">Customer Account Statement</h3>
                <p className="text-xs text-sky-100">{statementData.customer.name} • {statementData.customer.customerCode}</p>
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
              {/* Balance bar */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between mb-4 border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Current Outstanding Balance:</span>
                <span className="text-base font-black text-rose-600 font-mono">
                  {formatCurrency(statementData.currentBalance)}
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type / Ref</th>
                    <th className="pb-2 text-right">Debit (Owed)</th>
                    <th className="pb-2 text-right">Credit (Paid)</th>
                    <th className="pb-2 text-right">Running Debt</th>
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
                      <td className="py-2 text-right text-rose-600">{row.debit > 0 ? Number(row.debit).toFixed(2) : '-'}</td>
                      <td className="py-2 text-right text-emerald-600">{row.credit > 0 ? Number(row.credit).toFixed(2) : '-'}</td>
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
