const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { seedInitialData } = require('../utils/seedData');

exports.getSettings = (req, res) => {
  try {
    let settings = db.findById('settings', 'store_settings');
    if (!settings) {
      const all = db.find('settings');
      settings = all.length > 0 ? all[0] : {};
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve settings' });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const data = req.body;
    let settings = db.findById('settings', 'store_settings');

    const updates = {
      shopName: data.shopName !== undefined ? data.shopName : settings.shopName,
      tagline: data.tagline !== undefined ? data.tagline : settings.tagline,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : settings.logoUrl,
      address: data.address !== undefined ? data.address : settings.address,
      phone: data.phone !== undefined ? data.phone : settings.phone,
      email: data.email !== undefined ? data.email : settings.email,
      currency: data.currency !== undefined ? data.currency : settings.currency,
      currencySymbol: data.currencySymbol !== undefined ? data.currencySymbol : settings.currencySymbol,
      taxEnabled: data.taxEnabled !== undefined ? Boolean(data.taxEnabled) : settings.taxEnabled,
      taxRate: data.taxRate !== undefined ? parseFloat(data.taxRate) : settings.taxRate,
      receiptHeader: data.receiptHeader !== undefined ? data.receiptHeader : settings.receiptHeader,
      receiptFooter: data.receiptFooter !== undefined ? data.receiptFooter : settings.receiptFooter,
      thermalWidth: data.thermalWidth !== undefined ? data.thermalWidth : settings.thermalWidth,
      showBarcodeOnReceipt: data.showBarcodeOnReceipt !== undefined ? Boolean(data.showBarcodeOnReceipt) : settings.showBarcodeOnReceipt,
      barcodeLabelFormat: data.barcodeLabelFormat !== undefined ? data.barcodeLabelFormat : settings.barcodeLabelFormat,
      lowStockThreshold: data.lowStockThreshold !== undefined ? parseInt(data.lowStockThreshold, 10) : settings.lowStockThreshold,
      sessionTimeoutMinutes: data.sessionTimeoutMinutes !== undefined ? parseInt(data.sessionTimeoutMinutes, 10) : settings.sessionTimeoutMinutes,
      requirePinForPriceChange: data.requirePinForPriceChange !== undefined ? Boolean(data.requirePinForPriceChange) : settings.requirePinForPriceChange,
      requirePinForRefund: data.requirePinForRefund !== undefined ? Boolean(data.requirePinForRefund) : settings.requirePinForRefund,
      requirePinForStockAdjustment: data.requirePinForStockAdjustment !== undefined ? Boolean(data.requirePinForStockAdjustment) : settings.requirePinForStockAdjustment
    };

    const updated = db.updateById('settings', 'store_settings', updates);

    logAudit({
      action: 'SETTINGS_UPDATED',
      reference: 'store_settings',
      details: 'Store parameters and preferences updated',
      entityType: 'settings',
      entityId: 'store_settings',
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Settings saved successfully', settings: updated });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

// Users management
exports.getAllUsers = (req, res) => {
  try {
    const users = db.find('users').map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      hasPin: Boolean(u.pin),
      createdAt: u.createdAt
    }));
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, username, email, password, pin, role, status = 'active' } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, username, password and role are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.find('users').find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(400).json({ success: false, message: `Username "${username}" already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(String(pin), 10) : '';

    const newUser = db.create('users', {
      name: name.trim(),
      username: cleanUsername,
      email: email ? email.trim() : '',
      password: hashedPassword,
      pin: hashedPin,
      role,
      status
    });

    logAudit({
      action: 'USER_CREATED',
      reference: newUser.username,
      details: `Created new user "${newUser.name}" with role ${newUser.role}`,
      entityType: 'user',
      entityId: newUser.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, pin, role, status } = req.body;

    const existing = db.findById('users', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (role) updates.role = role;
    if (status) updates.status = status;

    if (password && password.trim()) {
      updates.password = await bcrypt.hash(password.trim(), 10);
    }
    if (pin && String(pin).trim()) {
      updates.pin = await bcrypt.hash(String(pin).trim(), 10);
    }

    const updated = db.updateById('users', id, updates);

    logAudit({
      action: 'USER_UPDATED',
      reference: updated.username,
      details: `Updated profile & permissions for ${updated.name}`,
      entityType: 'user',
      entityId: id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        status: updated.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.deleteUser = (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (req.user && req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own active account' });
    }

    const existing = db.findById('users', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.deleteById('users', id);

    logAudit({
      action: 'USER_DELETED',
      reference: existing.username,
      details: `Deleted account for user ${existing.name}`,
      entityType: 'user',
      entityId: id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// Database Backup & Restore
exports.exportBackup = (req, res) => {
  try {
    const backup = db.exportBackup();

    logAudit({
      action: 'DATABASE_BACKUP_EXPORTED',
      reference: 'BACKUP',
      details: `Full system snapshot exported. Version: ${backup.version}`,
      entityType: 'backup',
      entityId: 'export',
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, backup });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export database backup' });
  }
};

exports.restoreBackup = (req, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData || !backupData.data) {
      return res.status(400).json({ success: false, message: 'Valid backup data object required' });
    }

    db.restoreBackup(backupData);

    logAudit({
      action: 'DATABASE_RESTORED',
      reference: 'RESTORE',
      details: `Database restored from backup timestamp: ${backupData.exportedAt || 'unknown'}`,
      entityType: 'backup',
      entityId: 'restore',
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Database restored successfully' });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ success: false, message: 'Failed to restore database: ' + err.message });
  }
};

// Reset to Fresh Seed Data
exports.resetSampleData = async (req, res) => {
  try {
    await seedInitialData(true);

    logAudit({
      action: 'SAMPLE_DATA_RESET',
      reference: 'RESET',
      details: 'All collections re-seeded with clean initial catalog and demo users',
      entityType: 'system',
      entityId: 'reset',
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'System reset to clean sample retail store catalog' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset sample data' });
  }
};

// Clear All Database Data
exports.clearDatabase = async (req, res) => {
  try {
    db.clearData(true, true);

    logAudit({
      action: 'DATABASE_CLEARED',
      reference: 'DATABASE',
      details: 'All sales, products, customers, suppliers, inventory history and expenses wiped clean',
      entityType: 'system',
      entityId: 'clear',
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Database wiped clean successfully. Store inventory, sales, customers, suppliers, and expenses are now empty.' });
  } catch (err) {
    console.error('Clear database error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear database: ' + err.message });
  }
};

