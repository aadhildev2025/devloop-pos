const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, requireRole('admin', 'manager'), expenseController.getAllExpenses);
router.post('/', authenticateToken, requireRole('admin', 'manager'), expenseController.createExpense);
router.delete('/:id', authenticateToken, requireRole('admin'), expenseController.deleteExpense);

module.exports = router;
