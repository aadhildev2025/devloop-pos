import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Users,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  DollarSign,
  Clock,
  Printer,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DebtsHub({ onNavigate }) {
  const { formatCurrency } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('receivables'); // 'receivables' | 'payables'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/debts/overview');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load debts hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading Debtors & Creditors Ledger...
      </div>
    );
  }

  const { summary, debtors, creditors, recentCollections, recentPayouts } = data;

  const filteredDebtors = debtors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone && d.phone.includes(search)) ||
    d.customerCode.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCreditors = creditors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.businessName && c.businessName.toLowerCase().includes(search.toLowerCase())) ||
    c.supplierCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Receivables</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-sky-700 tracking-tight">
              {formatCurrency(summary.totalReceivables)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Owed by <b>{summary.debtorCount}</b> customers
            </p>
          </div>
        </div>

        {/* Total Payables */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Payables</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">
              {formatCurrency(summary.totalPayables)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Owed to <b>{summary.creditorCount}</b> suppliers
            </p>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Collections</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(summary.todayCollections)}
            </h3>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Customer debt collected today</p>
          </div>
        </div>

        {/* Today's Supplier Payouts */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Payouts</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {formatCurrency(summary.todayPayouts)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Paid to suppliers today</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Toggle Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'receivables'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer Receivables ({debtors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'payables'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Supplier Payables ({creditors.length})</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or code..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Tab 1: Customer Receivables */}
        {activeTab === 'receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Debtor / Customer</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Outstanding Debt</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebtors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No customer debts currently outstanding
                    </td>
                  </tr>
                ) : (
                  filteredDebtors.map((d) => (
                    <tr key={d.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>{d.name}</div>
                        <span className="text-[10px] font-mono text-slate-400">{d.customerCode}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">{d.phone || '-'}</td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-500">
                        {d.creditLimit > 0 ? formatCurrency(d.creditLimit) : 'No Limit'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-rose-600">
                        {formatCurrency(d.currentBalance)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(d.lastActivityDate).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('customers')}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Collect Payment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Supplier Payables */}
        {activeTab === 'payables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Creditor / Supplier</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCreditors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No supplier payables currently pending
                    </td>
                  </tr>
                ) : (
                  filteredCreditors.map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>{c.name}</div>
                        <span className="text-[10px] font-mono text-slate-400">{c.businessName} • {c.supplierCode}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">{c.phone || '-'}</td>

                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-amber-600">
                        {formatCurrency(c.outstandingBalance)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(c.lastActivityDate).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('suppliers')}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Pay Supplier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Collections & Payouts Ledger Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Collections */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Recent Customer Debt Collections</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {recentCollections.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No debt payments collected yet</p>
            ) : (
              recentCollections.map(p => (
                <div key={p.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{p.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {p.paymentNumber} • {new Date(p.createdAt).toLocaleDateString()} • {p.paymentMethod}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">
                    +{formatCurrency(p.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
            <span>Recent Supplier Payments</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {recentPayouts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No supplier payouts recorded yet</p>
            ) : (
              recentPayouts.map(sp => (
                <div key={sp.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{sp.supplierName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {sp.paymentNumber} • {new Date(sp.createdAt).toLocaleDateString()} • {sp.paymentMethod}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    -{formatCurrency(sp.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
