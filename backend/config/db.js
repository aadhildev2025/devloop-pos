const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const COLLECTIONS = [
  'users',
  'products',
  'categories',
  'brands',
  'sales',
  'heldSales',
  'customers',
  'customerPayments',
  'suppliers',
  'purchases',
  'supplierPayments',
  'stockAdjustments',
  'expenses',
  'auditLogs',
  'settings'
];

class Database {
  constructor() {
    this.cache = {};
    this.init();
  }

  init() {
    for (const col of COLLECTIONS) {
      const filePath = path.join(DATA_DIR, `${col}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
        this.cache[col] = [];
      } else {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          this.cache[col] = JSON.parse(raw || '[]');
        } catch (e) {
          console.error(`Error reading ${col}.json, initializing empty:`, e);
          this.cache[col] = [];
        }
      }
    }
  }

  getFilePath(col) {
    return path.join(DATA_DIR, `${col}.json`);
  }

  save(col) {
    const filePath = this.getFilePath(col);
    const tempPath = `${filePath}.tmp`;
    const data = JSON.stringify(this.cache[col] || [], null, 2);
    fs.writeFileSync(tempPath, data, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  find(col, query = {}) {
    const records = this.cache[col] || [];
    if (!query || Object.keys(query).length === 0) {
      return [...records];
    }
    return records.filter(item => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  findOne(col, query = {}) {
    const list = this.find(col, query);
    return list.length > 0 ? { ...list[0] } : null;
  }

  findById(col, id) {
    const records = this.cache[col] || [];
    const item = records.find(r => String(r.id) === String(id));
    return item ? { ...item } : null;
  }

  create(col, doc) {
    if (!this.cache[col]) this.cache[col] = [];
    const id = doc.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newDoc = {
      ...doc,
      id,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cache[col].push(newDoc);
    this.save(col);
    return { ...newDoc };
  }

  updateById(col, id, updates) {
    const records = this.cache[col] || [];
    const idx = records.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return null;
    records[idx] = {
      ...records[idx],
      ...updates,
      id: records[idx].id,
      updatedAt: new Date().toISOString()
    };
    this.save(col);
    return { ...records[idx] };
  }

  deleteById(col, id) {
    const records = this.cache[col] || [];
    const idx = records.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return false;
    records.splice(idx, 1);
    this.save(col);
    return true;
  }

  count(col, query = {}) {
    return this.find(col, query).length;
  }

  // Backup entire database as a single JSON object
  exportBackup() {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {}
    };
    for (const col of COLLECTIONS) {
      backup.data[col] = this.cache[col] || [];
    }
    return backup;
  }

  // Restore database from backup object
  restoreBackup(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file format');
    }
    for (const col of COLLECTIONS) {
      if (Array.isArray(backupData.data[col])) {
        this.cache[col] = backupData.data[col];
        this.save(col);
      }
    }
    return true;
  }

  // Clear collections data
  clearData(keepUsers = true, keepSettings = true) {
    for (const col of COLLECTIONS) {
      if (keepUsers && col === 'users') continue;
      if (keepSettings && col === 'settings') continue;
      this.cache[col] = [];
      this.save(col);
    }
    return true;
  }
}

const db = new Database();
module.exports = db;
