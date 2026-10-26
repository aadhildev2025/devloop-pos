import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  Shield,
  Eye,
  Calendar
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedAction !== 'all') query.append('action', selectedAction);
      if (search) query.append('search', search);
      if (fromDate) query.append('fromDate', fromDate);
      if (toDate) query.append('toDate', toDate);

      const res = await apiRequest(`/audit?${query.toString()}`);
      if (res.success) {
        setLogs(res.logs);
        if (res.availableActions) setAvailableActions(res.availableActions);
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction, search, fromDate, toDate]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Reference', 'Details', 'User', 'Role', 'IP'];
    const rows = logs.map(l => [
      `"${l.createdAt}"`,
      `"${l.action}"`,
      `"${l.reference || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.ip || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DevLoop_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-800">Master Audit Trail & System Logs</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, traceable history of sales, stock movements, financial payments, price overrides, and security events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, details, user..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">All Action Types ({availableActions.length})</option>
              {availableActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Date Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">Loading audit records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">No audit events found</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isAuth = log.action.includes('LOGIN') || log.action.includes('PASSWORD') || log.action.includes('PIN');
                  const isSale = log.action.includes('SALE');
                  const isRefund = log.action.includes('REFUND');
                  const isStock = log.action.includes('STOCK');

                  return (
                    <tr key={log.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                            isRefund
                              ? 'bg-rose-100 text-rose-700'
                              : isSale
                              ? 'bg-emerald-100 text-emerald-700'
                              : isStock
                              ? 'bg-blue-100 text-blue-700'
                              : isAuth
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-sky-700">
                        {log.reference || '-'}
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-700 max-w-xs truncate">
                        {log.details}
                      </td>

                      <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                        {log.userName}
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-500 uppercase text-[10px]">
                        {log.userRole}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 hover:bg-sky-100 text-sky-700 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Audit Record Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Event Action:</span>
                <span className="font-bold font-mono text-sm text-slate-800">{selectedLog.action}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Reference:</span>
                <span className="font-mono text-sky-700 font-bold">{selectedLog.reference || 'None'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Full Details:</span>
                <p className="p-2.5 bg-slate-50 rounded-xl text-slate-800 mt-1 font-sans">{selectedLog.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Performed By:</span>
                  <span className="font-bold text-slate-700">{selectedLog.userName} ({selectedLog.userRole})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">IP Address:</span>
                  <span className="font-mono text-slate-600">{selectedLog.ip || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Timestamp:</span>
                <span className="font-mono text-slate-600">{new Date(selectedLog.createdAt).toUTCString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
