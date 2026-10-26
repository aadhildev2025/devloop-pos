const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/overview', authenticateToken, requireRole('admin', 'manager'), debtController.getDebtsOverview);

module.exports = router;
