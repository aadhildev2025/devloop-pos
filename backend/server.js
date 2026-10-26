const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { seedInitialData } = require('./utils/seedData');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Copy logo if not yet present in backend uploads
const rootLogo = path.join(__dirname, '..', 'logo.png');
const targetLogo = path.join(UPLOADS_DIR, 'logo.png');
if (fs.existsSync(rootLogo) && !fs.existsSync(targetLogo)) {
  try {
    fs.copyFileSync(rootLogo, targetLogo);
  } catch (e) {
    console.warn('Could not copy logo to uploads:', e.message);
  }
}

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const posRoutes = require('./routes/posRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const debtRoutes = require('./routes/debtRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'DevLoop POS System',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Initialize sample retail store seed data then listen
seedInitialData(false)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`   DevLoop POS Server Running on port ${PORT}`);
      console.log(`   API Endpoint: http://localhost:${PORT}/api`);
      console.log(`=========================================`);
    });
  })
  .catch(err => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
