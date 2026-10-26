import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  DollarSign,
  TrendingUp,
  Boxes,
  RotateCcw,
  Download,
  Printer,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { formatCurrency } = useAuth();

  // Active Report Tab: 'pnl' | 'sales' | 'valuation'
  const [activeTab, setActiveTab] = useState('pnl');

  // Date filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Report Data States
  const [pnlData, setPnlData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [valuationData, setValuationData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pnlRes, salesRes, valRes] = await Promise.all([
        apiRequest(`/reports/pnl?fromDate=${fromDate}&toDate=${toDate}`),
        apiRequest(`/reports/sales?fromDate=${fromDate}&toDate=${toDate}`),
        apiRequest('/reports/valuation')
      ]);

      if (pnlRes.success) setPnlData(pnlRes.pnl);
      if (salesRes.success) setSalesData(salesRes);
      if (valRes.success) setValuationData(valRes);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'pnl' && pnlData) {
      csvContent += 'PROFIT AND LOSS STATEMENT\n';
      csvContent += `Period,${fromDate} to ${toDate}\n\n`;
      csvContent += `Gross Sales Revenue,${pnlData.revenue.grossSales}\n`;
      csvContent += `Discounts,${pnlData.revenue.discounts}\n`;
      csvContent += `Returns & Refunds,${pnlData.revenue.returnsAndRefunds}\n`;
      csvContent += `Net Sales Revenue,${pnlData.revenue.netSales}\n`;
      csvContent += `Cost of Goods Sold (COGS),${pnlData.costOfGoodsSold}\n`;
      csvContent += `Gross Profit,${pnlData.grossProfit}\n`;
      csvContent += `Operating Expenses,${pnlData.operatingExpenses.total}\n`;
      csvContent += `Net Profit,${pnlData.netProfit}\n`;
    } else if (activeTab === 'sales' && salesData) {
      csvContent += 'Product,Category,Quantity Sold,Revenue,Recorded Cost,Gross Profit\n';
      salesData.productBreakdown.forEach(p => {
        csvContent += `"${p.name}","${p.category}",${p.quantity},${p.revenue},${p.cost},${p.profit}\n`;
      });
    } else if (activeTab === 'valuation' && valuationData) {
      csvContent += 'Product,SKU,Barcode,Stock,Unit Cost,Unit Retail,Cost Value,Retail Value,Potential Margin\n';
      valuationData.items.forEach(it => {
        csvContent += `"${it.name}","${it.sku}","${it.barcode}",${it.stock},${it.purchasePrice},${it.sellingPrice},${it.totalCostValue},${it.totalRetailValue},${it.potentialProfit}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DevLoop_Report_${activeTab}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pnl'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Profit & Loss (P&L)</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'sales'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>Sales & COGS Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('valuation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'valuation'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory Valuation</span>
          </button>
        </div>

        {/* Date Filters & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Computing Financial Reports...</div>
      ) : (
        <>
          {/* TAB 1: PROFIT & LOSS STATEMENT */}
          {activeTab === 'pnl' && pnlData && (
            <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Statement of Profit & Loss</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Report Period: {fromDate} to {toDate} • Accounts for Sales, COGS, Discounts, Returns, & Operating Expenses
                </p>
              </div>

              {/* 3 Main Highlight Banners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Net Sales Revenue</span>
                  <h4 className="text-2xl font-black text-sky-900 mt-1 font-mono">{formatCurrency(pnlData.revenue.netSales)}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Actual cash collected: {formatCurrency(pnlData.revenue.actualCashCollected)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Gross Profit</span>
                  <h4 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{formatCurrency(pnlData.grossProfit)}</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    Gross Margin: {pnlData.grossMarginPercent}%
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Net Profit</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatCurrency(pnlData.netProfit)}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Net Margin: {pnlData.netMarginPercent}%
                  </p>
                </div>
              </div>

              {/* Full Accounting Line Breakdown Table */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-sm text-slate-800">Financial Breakdown</h4>
                <div className="divide-y divide-slate-100 text-xs font-mono">
                  {/* Revenue */}
                  <div className="py-2 flex justify-between font-sans">
                    <span className="font-semibold text-slate-700">Gross Sales Revenue:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatCurrency(pnlData.revenue.grossSales)}</span>
                  </div>

                  <div className="py-2 flex justify-between text-slate-500 font-sans">
                    <span>Less: Promotional Discounts Given:</span>
                    <span className="text-rose-600 font-mono">-{formatCurrency(pnlData.revenue.discounts)}</span>
                  </div>

                  <div className="py-2 flex justify-between text-slate-500 font-sans">
                    <span>Less: Returns & Refunds:</span>
                    <span className="text-rose-600 font-mono">-{formatCurrency(pnlData.revenue.returnsAndRefunds)}</span>
                  </div>

                  <div className="py-2.5 flex justify-between font-bold bg-slate-50 px-2 rounded-lg font-sans">
                    <span className="text-slate-900">NET REVENUE:</span>
                    <span className="text-sky-800 font-mono">{formatCurrency(pnlData.revenue.netSales)}</span>
                  </div>

                  {/* COGS */}
                  <div className="py-2 flex justify-between text-slate-600 font-sans">
                    <span>Less: Cost of Goods Sold (COGS at Purchase Cost):</span>
                    <span className="text-rose-600 font-mono">-{formatCurrency(pnlData.costOfGoodsSold)}</span>
                  </div>

                  <div className="py-2.5 flex justify-between font-bold bg-emerald-50/70 px-2 rounded-lg font-sans">
                    <span className="text-emerald-900">GROSS PROFIT:</span>
                    <span className="text-emerald-700 font-mono text-sm">{formatCurrency(pnlData.grossProfit)}</span>
                  </div>

                  {/* Operating Expenses */}
                  <div className="pt-3 pb-1 font-bold text-slate-800 font-sans text-xs">
                    Operating Expenses:
                  </div>

                  {pnlData.operatingExpenses.breakdown.length === 0 ? (
                    <div className="py-1 text-slate-400 font-sans italic text-[11px]">No operating expenses recorded for period</div>
                  ) : (
                    pnlData.operatingExpenses.breakdown.map((exp, idx) => (
                      <div key={idx} className="py-1.5 pl-4 flex justify-between text-slate-500 font-sans">
                        <span>{exp.category}:</span>
                        <span className="font-mono">-{formatCurrency(exp.amount)}</span>
                      </div>
                    ))
                  )}

                  <div className="py-2 flex justify-between font-semibold text-slate-700 font-sans">
                    <span>Total Operating Expenses:</span>
                    <span className="text-rose-600 font-mono">-{formatCurrency(pnlData.operatingExpenses.total)}</span>
                  </div>

                  {/* Final Net Profit */}
                  <div className="py-3 flex justify-between font-black text-base bg-sky-50 px-3 rounded-xl border border-sky-100 font-sans">
                    <span className="text-slate-900">NET PROFIT / LOSS:</span>
                    <span className="text-slate-900 font-mono">{formatCurrency(pnlData.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES & COGS BREAKDOWN */}
          {activeTab === 'sales' && salesData && (
            <div className="space-y-6">
              {/* Product Breakdown Table */}
              <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
                <h4 className="font-bold text-base text-slate-800 mb-4">Sales & Profit by Product</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="pb-2">Product Name</th>
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-center">Units Sold</th>
                        <th className="pb-2 text-right">Revenue</th>
                        <th className="pb-2 text-right">COGS (Cost)</th>
                        <th className="pb-2 text-right">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {salesData.productBreakdown.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-sans font-bold text-slate-800">{p.name}</td>
                          <td className="py-2.5 font-sans text-slate-500">{p.category}</td>
                          <td className="py-2.5 text-center font-bold text-slate-800">{p.quantity}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(p.revenue)}</td>
                          <td className="py-2.5 text-right text-slate-500">{formatCurrency(p.cost)}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">{formatCurrency(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cashier Performance Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
                <h4 className="font-bold text-base text-slate-800 mb-4">Sales by Cashier / User</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {salesData.cashierBreakdown.map((c, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="font-bold text-slate-800 text-sm">{c.cashier}</p>
                      <p className="text-xs text-slate-500 mt-1">{c.count} transactions processed</p>
                      <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-mono">
                        <span className="text-xs font-semibold text-sky-700">{formatCurrency(c.revenue)}</span>
                        <span className="text-xs font-bold text-emerald-600">+{formatCurrency(c.profit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY VALUATION */}
          {activeTab === 'valuation' && valuationData && (
            <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-bold text-base text-slate-800">Inventory Valuation Report</h4>
                  <p className="text-xs text-slate-400">Total Capital Invested in Stock</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400">Total Purchase Cost Valuation: </span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(valuationData.summary.totalCostValue)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="pb-2">Product</th>
                      <th className="pb-2 text-center">Stock Units</th>
                      <th className="pb-2 text-right">Unit Cost</th>
                      <th className="pb-2 text-right">Unit Retail</th>
                      <th className="pb-2 text-right">Total Cost Value</th>
                      <th className="pb-2 text-right">Total Retail Value</th>
                      <th className="pb-2 text-right">Potential Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {valuationData.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-sans font-bold text-slate-800">
                          <div>{it.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{it.sku}</span>
                        </td>
                        <td className="py-2.5 text-center font-bold text-slate-700">{it.stock}</td>
                        <td className="py-2.5 text-right">{Number(it.purchasePrice).toFixed(2)}</td>
                        <td className="py-2.5 text-right">{Number(it.sellingPrice).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(it.totalCostValue)}</td>
                        <td className="py-2.5 text-right font-bold text-sky-700">{formatCurrency(it.totalRetailValue)}</td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">+{formatCurrency(it.potentialProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
