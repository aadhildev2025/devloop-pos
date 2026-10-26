import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50/60 p-4">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-sky-900/5 border border-sky-100 p-8">
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-3 bg-white p-2 rounded-2xl shadow-md shadow-sky-100 border border-sky-100 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="DevLoop POS"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
            <span>DevLoop</span>
            <span className="text-sky-600">POS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Smart Retail & Inventory Management System</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-slate-800 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-slate-800 font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-sky-600/20 hover:shadow-lg transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In to POS'}</span>
          </button>
        </form>

        {/* Quick Demo Credentials Selection */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className={`p-2 rounded-xl border text-xs transition flex flex-col ${
                username === 'admin'
                  ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="font-bold">👑 Admin User</span>
              <span className="text-[10px] text-slate-400">admin / admin123 (PIN: 1234)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cashier', 'cashier123')}
              className={`p-2 rounded-xl border text-xs transition flex flex-col ${
                username === 'cashier'
                  ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="font-bold">🛒 Cashier</span>
              <span className="text-[10px] text-slate-400">cashier / cashier123 (PIN: 2345)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager', 'manager123')}
              className={`p-2 rounded-xl border text-xs transition flex flex-col ${
                username === 'manager'
                  ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="font-bold">📊 Manager</span>
              <span className="text-[10px] text-slate-400">manager / manager123 (PIN: 5678)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('inventory', 'staff123')}
              className={`p-2 rounded-xl border text-xs transition flex flex-col ${
                username === 'inventory'
                  ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="font-bold">📦 Inventory Staff</span>
              <span className="text-[10px] text-slate-400">inventory / staff123 (PIN: 9012)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
