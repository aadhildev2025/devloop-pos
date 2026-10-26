import React, { useState } from 'react';
import { Lock, LogOut, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LockScreen() {
  const { user, unlockSession, logout, settings } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await unlockSession(pin);
    } catch (err) {
      setError(err.message || 'Incorrect PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyClick = (num) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        // Auto trigger verify if 4 digits
        setTimeout(() => {
          unlockSession(nextPin).catch(err => {
            setError(err.message || 'Incorrect PIN');
            setPin('');
          });
        }, 100);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden text-center p-8">
        <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1">Session Locked</h2>
        <p className="text-xs text-slate-500 mb-6">
          Logged in as <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.role})
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                pin.length > idx
                  ? 'border-sky-500 bg-sky-50 text-sky-700 scale-105 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              {pin.length > idx ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              type="button"
              key={num}
              onClick={() => handleKeyClick(num)}
              className="py-3.5 text-xl font-bold text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-sky-600 rounded-2xl transition active:scale-95 border border-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="py-3.5 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyClick(0)}
            className="py-3.5 text-xl font-bold text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-sky-600 rounded-2xl transition active:scale-95 border border-slate-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin(prev => prev.slice(0, -1))}
            className="py-3.5 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition"
          >
            ⌫
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-2 rounded-xl hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch User</span>
          </button>

          <button
            onClick={handleUnlock}
            disabled={loading || pin.length < 4}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-xl transition disabled:opacity-40"
          >
            <KeyRound className="w-4 h-4" />
            <span>Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );
}
