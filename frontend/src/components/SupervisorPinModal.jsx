import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SupervisorPinModal({ isOpen, onClose, onSuccess, title = 'Supervisor Authorization Required', description = 'Enter an Admin or Manager PIN to proceed with this sensitive action.' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifySupervisorPin } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter supervisor PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifySupervisorPin(pin);
      if (res.success) {
        onSuccess(pin, res.supervisor);
        onClose();
        setPin('');
      } else {
        setError(res.message || 'Invalid PIN');
      }
    } catch (err) {
      setError(err.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyClick = (num) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-200" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button
            onClick={() => { onClose(); setPin(''); setError(''); }}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">{description}</p>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center mb-6">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > idx
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {pin.length > idx ? '●' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  type="button"
                  key={num}
                  onClick={() => handleKeyClick(num)}
                  className="py-3 text-lg font-bold text-slate-700 bg-slate-100 hover:bg-sky-100 hover:text-sky-700 rounded-xl transition active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick(0)}
                className="py-3 text-lg font-bold text-slate-700 bg-slate-100 hover:bg-sky-100 hover:text-sky-700 rounded-xl transition active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                ⌫ Del
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying PIN...' : 'Authorize Action'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
