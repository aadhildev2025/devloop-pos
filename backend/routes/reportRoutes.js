const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/sales', authenticateToken, requireRole('admin', 'manager'), reportController.getSalesReport);
router.get('/pnl', authenticateToken, requireRole('admin', 'manager'), reportController.getProfitAndLossReport);
router.get('/valuation', authenticateToken, requireRole('admin', 'manager'), reportController.getInventoryValuation);

module.exports = router;
