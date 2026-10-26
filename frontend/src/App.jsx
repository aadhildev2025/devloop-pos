import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import LockScreen from './components/LockScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import BarcodeStation from './pages/BarcodeStation';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import DebtsHub from './pages/DebtsHub';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import SettingsPage from './pages/Settings';

function AppContent() {
  const { user, isLocked } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return user?.role === 'cashier' ? 'pos' : 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('devloop_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('devloop_sidebar_open', String(next));
      return next;
    });
  };

  const handleSetSidebarOpen = (val) => {
    setSidebarOpen(val);
    localStorage.setItem('devloop_sidebar_open', String(val));
  };

  if (!user) {
    return <Login />;
  }

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Executive Dashboard & Financial Analytics', subtitle: 'Real-time retail metrics, gross/net profits, and sales trends' };
      case 'pos':
        return { title: 'High-Speed POS Checkout Terminal', subtitle: 'Barcode scanner & keyboard-driven retail sales billing' };
      case 'inventory':
        return { title: 'Inventory Management & Stock Ledger', subtitle: 'Real-time stock quantities, valuation, reconciliation, and audit cards' };
      case 'barcodes':
        return { title: 'Barcode Generation & Label Print Station', subtitle: 'Code 128 / EAN-13 automatic barcode creation and multi-size thermal printing' };
      case 'customers':
        return { title: 'Customer Management & Receivables', subtitle: 'Customer directory, credit limits, debt payments, and WhatsApp reminders' };
      case 'suppliers':
        return { title: 'Supplier Management & GRN Purchase Orders', subtitle: 'Vendors directory, purchase invoicing, live stock receipt, and supplier statements' };
      case 'debts':
        return { title: 'Creditors, Debts & Payables Hub', subtitle: 'Unified overview of money owed by customers and money owed to suppliers' };
      case 'reports':
        return { title: 'Financial Reports & Profit and Loss', subtitle: 'True COGS-based sales analysis, P&L statements, and inventory valuation' };
      case 'expenses':
        return { title: 'Operating Expenses Tracker', subtitle: 'Log store overheads, electricity, rent, salaries, and maintenance for net profit accuracy' };
      case 'settings':
        return { title: 'Store Settings, Security & Database Backup', subtitle: 'Store profile, default LKR currency, user accounts, roles, and JSON backup/restore' };
      default:
        return { title: 'DevLoop POS System', subtitle: 'Retail and inventory management' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* Session Lock Screen Overlay */}
      {isLocked && <LockScreen />}

      {/* Main Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={handleSetSidebarOpen}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'pos' && <POS />}
          {activeTab === 'inventory' && <Inventory onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'barcodes' && <BarcodeStation />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'debts' && <DebtsHub onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'expenses' && <Expenses />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
