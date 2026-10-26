import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Users,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Award,
  Clock,
  Printer
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';

const COLORS = ['#0284c7', '#38bdf8', '#0ea5e9', '#6366f1', '#f59e0b'];

export default function Dashboard() {
  const { formatCurrency } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7days');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard/stats');
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading Financial Analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Sales</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {formatCurrency(stats.todaySales)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="text-sky-700 font-bold">{stats.todayCount}</span> transactions completed today
            </p>
          </div>
        </div>

        {/* Weekly & Monthly Overview */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Summary</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Last 7 Days:</span>
              <span className="font-bold text-slate-800">{formatCurrency(stats.weekSales)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">This Month:</span>
              <span className="font-bold text-slate-800">{formatCurrency(stats.monthSales)}</span>
            </div>
          </div>
        </div>

        {/* Gross Profit & Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Profitability</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Gross Profit:</span>
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(stats.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Net Profit:</span>
              <span className="text-base font-black text-slate-900">{formatCurrency(stats.netProfit)}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Based on COGS & recorded expenses</p>
          </div>
        </div>

        {/* Inventory Stock & Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventory Status</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Total Products:</span>
              <span className="font-bold text-slate-800">{stats.totalInventoryItems}</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1 text-amber-600 font-semibold">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Items:
              </span>
              <span>{stats.lowStockCount}</span>
            </div>
            {stats.outOfStockCount > 0 && (
              <div className="flex justify-between items-center text-xs mt-0.5 text-rose-600 font-bold">
                <span>Out of Stock:</span>
                <span>{stats.outOfStockCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receivables & Payables Quick Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Receivables */}
        <div className="bg-gradient-to-r from-sky-500/10 via-sky-50/50 to-white p-5 rounded-2xl border border-sky-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-900 uppercase tracking-wider">Customer Debts (Receivables)</p>
              <h4 className="text-xl font-black text-slate-800">{formatCurrency(stats.totalCustomerDebts)}</h4>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-white text-sky-800 rounded-lg shadow-2xs border border-sky-100">
            Money Owed to Shop
          </span>
        </div>

        {/* Supplier Payables */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-white p-5 rounded-2xl border border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Supplier Payments (Payables)</p>
              <h4 className="text-xl font-black text-slate-800">{formatCurrency(stats.totalSupplierPayments)}</h4>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-white text-amber-800 rounded-lg shadow-2xs border border-amber-100">
            Owed to Suppliers
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Sales & Gross Profit Trend</h3>
              <p className="text-xs text-slate-400">Daily business volume (Last 7 Days)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold">
                <span className="w-3 h-3 bg-sky-500 rounded-xs"></span> Sales
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span> Profit
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesChart}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Rs.${val}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" name="Sales Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" name="Gross Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown (1 column) */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Payment Methods</h3>
            <p className="text-xs text-slate-400">Sales volume by settlement method</p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.paymentMethodsBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {stats.paymentMethodsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend textAnchor="middle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Best Sellers & Recent Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Selling Products */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-base">Top Selling Products</h3>
          </div>

          <div className="space-y-3">
            {stats.bestSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales recorded yet</p>
            ) : (
              stats.bestSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-sky-50/60 transition">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-800">{p.quantity} units</p>
                    <p className="text-[10px] text-sky-600 font-semibold">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices Table (2 columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-base">Recent Transactions</h3>
            </div>
            <span className="text-xs text-slate-400">Latest 10 Invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2 font-bold">Invoice #</th>
                  <th className="pb-2 font-bold">Customer</th>
                  <th className="pb-2 font-bold">Total</th>
                  <th className="pb-2 font-bold">Payment</th>
                  <th className="pb-2 font-bold">Status</th>
                  <th className="pb-2 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 font-mono font-bold text-sky-700">{tx.invoiceNumber}</td>
                    <td className="py-2.5 font-medium text-slate-700">{tx.customerName || 'Walk-in'}</td>
                    <td className="py-2.5 font-bold text-slate-900">{formatCurrency(tx.grandTotal)}</td>
                    <td className="py-2.5 uppercase text-[10px] font-semibold text-slate-500">{tx.paymentType}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : tx.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="px-2 py-1 bg-slate-100 hover:bg-sky-100 hover:text-sky-700 rounded-lg text-[11px] font-semibold transition"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Print Preview Modal */}
      {selectedReceipt && (
        <ReceiptModal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          sale={selectedReceipt}
        />
      )}
    </div>
  );
}
