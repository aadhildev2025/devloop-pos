const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/stats', authenticateToken, requireRole('admin', 'manager'), dashboardController.getDashboardStats);

module.exports = router;
