import React, { useState, useEffect } from 'react';
import { Clock, Keyboard, ShieldAlert, Sparkles, HelpCircle, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle }) {
  const { settings, user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-sky-100/90 px-6 flex items-center justify-between shrink-0 no-print">
      {/* Title & subtitle */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Keyboard shortcuts trigger */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200/80 text-xs font-medium transition"
          title="POS Keyboard Shortcuts"
        >
          <Keyboard className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        {/* Currency badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50/70 border border-sky-200/60 text-sky-800 text-xs font-semibold">
          <Store className="w-3.5 h-3.5 text-sky-600" />
          <span>Currency: {settings.currency || 'LKR'} ({settings.currencySymbol || 'Rs.'})</span>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span className="hidden lg:inline text-slate-400">|</span>
          <span className="hidden lg:inline text-slate-500">{time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-sky-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-sky-700 font-bold">
                <Keyboard className="w-5 h-5" />
                <span>Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Scan Barcode / Search</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">F2 or Click Barcode Field</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Select / Add Customer</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">F4</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Pay / Checkout</span>
                <kbd className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-mono font-bold">F8 or Enter</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Hold Active Sale</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">F9</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Cancel / Clear Cart</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">Esc</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Print Receipt</span>
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">Ctrl + P</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-5 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
