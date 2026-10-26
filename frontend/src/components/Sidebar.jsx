import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Barcode,
  Users,
  Truck,
  CreditCard,
  Receipt,
  FileBarChart,
  Settings,
  Lock,
  LogOut,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isOpen = true, setIsOpen }) {
  const { user, logout, lockSession, settings } = useAuth();

  const role = user?.role || 'cashier';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isPrivileged = isAdmin || isManager;

  const menuItems = [
    ...(isPrivileged
      ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : []),
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, hotkey: 'F1' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
    { id: 'barcodes', label: 'Barcode Station', icon: Barcode },
    { id: 'customers', label: 'Customers & Debts', icon: Users },
    ...(isPrivileged
      ? [
          { id: 'suppliers', label: 'Suppliers & GRN', icon: Truck },
          { id: 'debts', label: 'Debts & Payables', icon: CreditCard },
          { id: 'expenses', label: 'Shop Expenses', icon: Receipt },
          { id: 'reports', label: 'Reports & P&L', icon: FileBarChart }
        ]
      : []),
    ...(isAdmin
      ? [{ id: 'settings', label: 'Settings & Users', icon: Settings }]
      : [])
  ];

  return (
    <aside
      className={`bg-white border-r border-sky-100 flex flex-col shrink-0 select-none shadow-xs no-print h-screen sticky top-0 transition-all duration-300 ease-in-out z-30 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      {isOpen ? (
        <div className="p-4 border-b border-sky-100/80 bg-gradient-to-b from-sky-50/60 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-white p-1 border border-sky-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="DevLoop POS"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                <span>DevLoop</span>
                <span className="text-sky-600">POS</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-400 truncate mt-1">
                {settings.shopName || 'Retail & Inventory'}
              </p>
            </div>
          </div>

          {/* Close Sidebar Button */}
          {setIsOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-sky-100/70 transition shrink-0 ml-1 cursor-pointer"
              title="Close / Collapse sidebar"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        /* Collapsed Header: Visible Logo */
        <div className="p-3 border-b border-sky-100/80 bg-gradient-to-b from-sky-50/60 to-transparent flex flex-col items-center justify-center">
          <button
            onClick={() => setIsOpen(true)}
            title="DevLoop POS (Click to expand)"
            className="w-12 h-12 rounded-xl bg-white p-1 border border-sky-200/80 shadow-xs flex items-center justify-center overflow-hidden hover:scale-105 hover:border-sky-400 transition cursor-pointer"
          >
            <img
              src="/logo.png"
              alt="DevLoop POS"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className={`flex-1 overflow-y-auto py-3 ${isOpen ? 'px-3 space-y-1' : 'px-2 space-y-2 flex flex-col items-center'}`}>
        {isOpen && (
          <div className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Menu Navigation
          </div>
        )}

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (isOpen) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20 translate-x-1'
                    : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                  <span>{item.label}</span>
                </div>
                {item.hotkey && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-sky-400/40 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.hotkey}
                  </span>
                )}
              </button>
            );
          }

          /* Collapsed Icon-rail Button */
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group relative cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-sky-600 hover:text-sky-700 hover:bg-sky-50/90'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'text-white stroke-[2.2]' : 'text-sky-600 stroke-[2]'}`} />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 flex items-center gap-2">
                <span>{item.label}</span>
                {item.hotkey && (
                  <span className="text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                    {item.hotkey}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* User profile & Session control footer */}
      {isOpen ? (
        <div className="p-3 border-t border-sky-100 bg-slate-50/70">
          <div className="bg-white p-2.5 rounded-2xl border border-sky-100/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {user?.name || 'Authorized User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : role === 'inventory_staff'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
              <button
                onClick={lockSession}
                title="Lock screen session (PIN required to unlock)"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-600 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Lock</span>
              </button>
              <button
                onClick={logout}
                title="Log out of system"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Footer */
        <div className="p-2 border-t border-sky-100 bg-slate-50/70 flex flex-col items-center space-y-2">
          <div
            title={`${user?.name || 'User'} (${role})`}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-default"
          >
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col gap-1.5 w-full items-center">
            <button
              onClick={lockSession}
              title="Lock screen session"
              className="w-10 h-8 flex items-center justify-center bg-white hover:bg-sky-100 hover:text-sky-700 text-slate-600 rounded-xl text-xs border border-sky-100/90 shadow-2xs transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={logout}
              title="Log out"
              className="w-10 h-8 flex items-center justify-center bg-white hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-xl text-xs border border-rose-100/90 shadow-2xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
