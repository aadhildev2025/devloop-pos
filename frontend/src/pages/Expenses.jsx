import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Trash2,
  Filter
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Expenses() {
  const { formatCurrency } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Electricity',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    description: ''
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/expenses?category=${category}`);
      if (res.success) {
        setExpenses(res.expenses);
      }
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [category]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/expenses', {
        method: 'POST',
        body: formData
      });
      if (res.success) {
        setModalOpen(false);
        setFormData({
          category: 'Electricity',
          amount: '',
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'bank_transfer',
          description: ''
        });
        fetchExpenses();
      }
    } catch (err) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await apiRequest(`/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recorded Expenses</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalExpenseAmount)}</h3>
          <p className="text-xs text-slate-500">{expenses.length} operating payment vouchers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs flex items-center justify-between col-span-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Track Operating Overheads</span>
            <p className="text-xs text-slate-600 mt-1">
              Recorded expenses automatically factor into the Net Profit calculation on the Dashboard and P&L Report.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Category Filter:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5"
            >
              <option value="all">All Categories</option>
              <option value="Electricity">Electricity</option>
              <option value="Rent">Rent</option>
              <option value="Salaries">Staff Salaries</option>
              <option value="Stationery">Stationery & Rolls</option>
              <option value="Maintenance">Maintenance & Repairs</option>
              <option value="Utilities">Water & Telecom</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other Miscellaneous</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">Loading expenses...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">No expenses recorded</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-sky-50/30 transition">
                    <td className="py-3 px-4 font-sans text-slate-500">{e.expenseDate}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">{e.category}</td>
                    <td className="py-3 px-4 font-sans text-slate-600">{e.description || '-'}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">{e.paymentMethod}</td>
                    <td className="py-3 px-4 font-sans text-slate-500">{e.recordedBy}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 font-mono text-sm">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Record Operating Expense</h3>
              <button onClick={() => setModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Electricity">Electricity</option>
                  <option value="Rent">Shop Rent</option>
                  <option value="Salaries">Staff Salaries / Wages</option>
                  <option value="Stationery">Paper Rolls & Stationery</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Utilities">Water & Utilities</option>
                  <option value="Marketing">Advertising & Marketing</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="cash">Cash Drawer</option>
                  <option value="bank_transfer">Bank Transfer / Online</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. CEB Electricity bill for month"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
