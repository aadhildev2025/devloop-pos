import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('devloop_pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('devloop_pos_token'));
  const [isLocked, setIsLocked] = useState(false);
  const [settings, setSettings] = useState({
    shopName: 'DevLoop POS',
    currency: 'LKR',
    currencySymbol: 'Rs. ',
    taxEnabled: false,
    taxRate: 0,
    lowStockThreshold: 10,
    sessionTimeoutMinutes: 30
  });

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token, fetchSettings]);

  // Session auto-lock timeout
  useEffect(() => {
    if (!user || isLocked) return;
    const timeoutMin = settings.sessionTimeoutMinutes || 30;
    if (timeoutMin <= 0) return;

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLocked(true);
      }, timeoutMin * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [user, isLocked, settings.sessionTimeoutMinutes]);

  // Listen for auth expired event
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('devloop_pos_user');
      localStorage.removeItem('devloop_pos_token');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (username, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      setIsLocked(false);
      localStorage.setItem('devloop_pos_user', JSON.stringify(res.user));
      localStorage.setItem('devloop_pos_token', res.token);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const unlockSession = async (pin) => {
    const res = await apiRequest('/auth/unlock-pin', {
      method: 'POST',
      body: { pin }
    });

    if (res.success) {
      setIsLocked(false);
      return true;
    }
    throw new Error(res.message || 'Incorrect PIN');
  };

  const lockSession = () => {
    setIsLocked(true);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsLocked(false);
    localStorage.removeItem('devloop_pos_user');
    localStorage.removeItem('devloop_pos_token');
  };

  const verifySupervisorPin = async (pin) => {
    const res = await apiRequest('/auth/verify-supervisor', {
      method: 'POST',
      body: { pin }
    });
    return res;
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${settings.currencySymbol || 'Rs. '}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLocked,
        settings,
        login,
        logout,
        lockSession,
        unlockSession,
        verifySupervisorPin,
        refreshSettings: fetchSettings,
        formatCurrency
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
