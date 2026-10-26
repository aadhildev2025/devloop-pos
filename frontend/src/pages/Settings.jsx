import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  ShieldCheck,
  Users,
  Database,
  Lock,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { settings, refreshSettings, user } = useAuth();

  // Active Settings Tab: 'general' | 'users' | 'backup'
  const [activeTab, setActiveTab] = useState('general');

  // General Settings Form
  const [storeForm, setStoreForm] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User Management States
  const [usersList, setUsersList] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    pin: '',
    role: 'cashier',
    status: 'active'
  });

  // Password / PIN Change Form
  const [securityForm, setSecurityForm] = useState({
    oldPassword: '',
    newPassword: '',
    newPin: ''
  });
  const [secMsg, setSecMsg] = useState('');

  // Backup & Restore
  const [backupJson, setBackupJson] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await apiRequest('/settings/users');
      if (res.success) setUsersList(res.users);
    } catch (err) {
      console.warn('Could not load users list:', err);
    }
  };

  useEffect(() => {
    setStoreForm({ ...settings });
    fetchUsers();
  }, [settings]);

  // Save Store Settings
  const handleSaveStoreSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/settings', {
        method: 'PUT',
        body: storeForm
      });
      if (res.success) {
        setSaveSuccess(true);
        refreshSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    }
  };

  // Change Password / PIN
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecMsg('');
    try {
      if (securityForm.newPassword) {
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: {
            oldPassword: securityForm.oldPassword,
            newPassword: securityForm.newPassword
          }
        });
      }
      if (securityForm.newPin) {
        await apiRequest('/auth/change-pin', {
          method: 'POST',
          body: { newPin: securityForm.newPin }
        });
      }
      setSecMsg('Security credentials updated successfully!');
      setSecurityForm({ oldPassword: '', newPassword: '', newPin: '' });
    } catch (err) {
      setSecMsg(err.message || 'Error updating credentials');
    }
  };

  // User Administration
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setNewUserForm({
      name: '',
      username: '',
      email: '',
      password: '',
      pin: '',
      role: 'cashier',
      status: 'active'
    });
    setUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiRequest(`/settings/users/${editingUser.id}`, {
          method: 'PUT',
          body: newUserForm
        });
      } else {
        await apiRequest('/settings/users', {
          method: 'POST',
          body: newUserForm
        });
      }
      setUserModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to save user account');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Are you sure you want to remove user "${name}"?`)) return;
    try {
      await apiRequest(`/settings/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // Export Full Database Backup
  const handleExportBackup = async () => {
    try {
      const res = await apiRequest('/settings/backup/export');
      if (res.success) {
        const jsonStr = JSON.stringify(res.backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `DevLoop_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to export database backup');
    }
  };

  // Restore Database Backup
  const handleRestoreBackup = async () => {
    if (!backupJson.trim()) return;
    if (!confirm('WARNING: Restoring will overwrite current database records with the backup file data. Proceed?')) {
      return;
    }

    try {
      const parsed = JSON.parse(backupJson.trim());
      const res = await apiRequest('/settings/backup/restore', {
        method: 'POST',
        body: { backupData: parsed }
      });
      if (res.success) {
        alert('Database restored successfully! Reloading...');
        window.location.reload();
      }
    } catch (err) {
      alert('Invalid backup JSON format or restore failed: ' + err.message);
    }
  };

  // Reset to Sample Data
  const handleResetSampleData = async () => {
    if (!confirm('Reset store data back to clean initial demo catalog and users? Current data will be replaced.')) {
      return;
    }
    try {
      const res = await apiRequest('/settings/backup/reset-sample', { method: 'POST' });
      if (res.success) {
        alert(res.message);
        window.location.reload();
      }
    } catch (err) {
      alert('Reset failed');
    }
  };

  // Clear Database (Wipe all data)
  const handleClearDatabase = async () => {
    if (!confirm('DANGER: Are you sure you want to CLEAR THE ENTIRE DATABASE?\n\nThis will permanently delete all sales invoices, products, stock ledger, customers, suppliers, expenses, and transaction logs.\n(Your user accounts and store profile settings will be preserved).\n\nProceed with clear?')) {
      return;
    }
    try {
      const res = await apiRequest('/settings/backup/clear-database', { method: 'POST' });
      if (res.success) {
        alert(res.message);
        window.location.reload();
      }
    } catch (err) {
      alert('Failed to clear database: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Navigation Header Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store & Currency</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & Roles ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Password & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Data Protection</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* TAB 1: GENERAL STORE SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveStoreSettings} className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800">Business Profile & Receipts</h3>
            <p className="text-xs text-slate-400">Configure store branding, currency (LKR default), and thermal receipt printing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Store / Shop Name *</label>
              <input
                type="text"
                value={storeForm.shopName || ''}
                onChange={(e) => setStoreForm({ ...storeForm, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={storeForm.tagline || ''}
                onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Store Address</label>
              <input
                type="text"
                value={storeForm.address || ''}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={storeForm.phone || ''}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Currency Code</label>
              <select
                value={storeForm.currency || 'LKR'}
                onChange={(e) => {
                  const curr = e.target.value;
                  const sym = curr === 'LKR' ? 'Rs. ' : curr === 'USD' ? '$ ' : curr === 'EUR' ? '€ ' : '£ ';
                  setStoreForm({ ...storeForm, currency: curr, currencySymbol: sym });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="LKR">LKR (Sri Lankan Rupee - Rs.) [Default]</option>
                <option value="USD">USD (US Dollar - $)</option>
                <option value="EUR">EUR (Euro - €)</option>
                <option value="GBP">GBP (British Pound - £)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Symbol Display</label>
              <input
                type="text"
                value={storeForm.currencySymbol || 'Rs. '}
                onChange={(e) => setStoreForm({ ...storeForm, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>

            {/* Tax Settings */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tax Settings (VAT / GST)</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeForm.taxEnabled || false}
                    onChange={(e) => setStoreForm({ ...storeForm, taxEnabled: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Enable Tax on Checkout</span>
                </label>
                {storeForm.taxEnabled && (
                  <input
                    type="number"
                    value={storeForm.taxRate || 0}
                    onChange={(e) => setStoreForm({ ...storeForm, taxRate: e.target.value })}
                    placeholder="Rate %"
                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold"
                  />
                )}
              </div>
            </div>

            {/* Low Stock Warning Threshold */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Low Stock Alert Threshold</label>
              <input
                type="number"
                value={storeForm.lowStockThreshold || 10}
                onChange={(e) => setStoreForm({ ...storeForm, lowStockThreshold: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>

            {/* Receipt Footer Note */}
            <div className="col-span-1 md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Receipt Footer Return Policy / Message</label>
              <textarea
                rows="2"
                value={storeForm.receiptFooter || ''}
                onChange={(e) => setStoreForm({ ...storeForm, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-sky-500"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              Save Store Profile & Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: USER ACCOUNTS & ROLE PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-800">User Accounts & Role Permissions</h3>
              <p className="text-xs text-slate-400">Admin, Manager, Cashier, and Inventory Staff accounts</p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create User Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Security PIN</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{u.username}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'manager'
                            ? 'bg-blue-100 text-blue-700'
                            : u.role === 'inventory_staff'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {u.hasPin ? (
                        <span className="text-emerald-600 font-semibold text-[11px]">Configured (Hashed)</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[10px]">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {user.id !== u.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PASSWORD & PIN SECURITY */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs max-w-lg space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800">Change Password & Quick Unlock PIN</h3>
            <p className="text-slate-400 mt-0.5">Secure your personal operator account</p>
          </div>

          {secMsg && (
            <div className={`p-3 rounded-xl border text-xs font-semibold ${
              secMsg.includes('success') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {secMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
            <input
              type="password"
              value={securityForm.oldPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, oldPassword: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">New Password (leave blank if keeping current)</label>
            <input
              type="password"
              value={securityForm.newPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">New 4-Digit Quick PIN (for session lock/supervisor overrides)</label>
            <input
              type="password"
              maxLength="6"
              value={securityForm.newPin}
              onChange={(e) => setSecurityForm({ ...securityForm, newPin: e.target.value })}
              placeholder="e.g. 1234"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md transition"
            >
              Update Security Credentials
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800">Database Backup & Data Protection</h3>
            <p className="text-xs text-slate-400">Download complete point-in-time system backups and restore verified datasets</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Backup Card */}
            <div className="p-5 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
              <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
                <Download className="w-4 h-4" />
                <span>Export Full System Backup</span>
              </div>
              <p className="text-xs text-slate-600">
                Exports all products, customers, suppliers, inventory history, sales invoices, debt records, and audit logs into a validated snapshot JSON file.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Backup File</span>
              </button>
            </div>

            {/* Reset to Clean Sample Data */}
            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                <span>Reset / Re-Seed Retail Store Demo Data</span>
              </div>
              <p className="text-xs text-slate-600">
                Resets the database with fresh retail store inventory items (in LKR), standard suppliers, demo customer balances, and default operator accounts.
              </p>
              <button
                type="button"
                onClick={handleResetSampleData}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Reset Store Demo Data
              </button>
            </div>

            {/* Clear Entire Database (Wipe All Store Records) */}
            <div className="p-5 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear Entire Database (Wipe All Data)</span>
              </div>
              <p className="text-xs text-slate-600">
                Permanently wipes all sales, stock ledger, products, customers, debts, suppliers, and expenses to start fresh with a completely clean slate. User login accounts and store profile settings are preserved.
              </p>
              <button
                type="button"
                onClick={handleClearDatabase}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Database Now</span>
              </button>
            </div>
          </div>

          {/* Restore from JSON Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Restore Database from Backup JSON</span>
            </div>
            <p className="text-xs text-slate-500">
              Paste the contents of your exported backup file below to restore:
            </p>
            <textarea
              rows="4"
              value={backupJson}
              onChange={(e) => setBackupJson(e.target.value)}
              placeholder="Paste backup JSON content here..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono"
            ></textarea>
            <button
              type="button"
              onClick={handleRestoreBackup}
              disabled={!backupJson.trim()}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-40"
            >
              Verify & Restore Database
            </button>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">New Operator Account</h3>
              <button onClick={() => setUserModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="e.g. cashier2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Permissions *</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="cashier">Cashier (POS Checkout only)</option>
                  <option value="inventory_staff">Inventory Staff (Catalog & Stock)</option>
                  <option value="manager">Manager (Sales, Purchases, Inventory)</option>
                  <option value="admin">Administrator (Full System Access)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quick 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength="6"
                  value={newUserForm.pin}
                  onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value })}
                  placeholder="1234"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUserModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
