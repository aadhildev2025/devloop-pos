const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

exports.getAllExpenses = (req, res) => {
  try {
    const { fromDate, toDate, category } = req.query;
    let expenses = db.find('expenses');

    if (fromDate) {
      expenses = expenses.filter(e => e.expenseDate >= fromDate);
    }
    if (toDate) {
      expenses = expenses.filter(e => e.expenseDate <= toDate);
    }
    if (category && category !== 'all') {
      expenses = expenses.filter(e => e.category === category);
    }

    expenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

    const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({ success: true, count: expenses.length, totalAmount, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses' });
  }
};

exports.createExpense = (req, res) => {
  try {
    const { category, amount, expenseDate, paymentMethod = 'cash', description = '' } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!category || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Category and valid amount required' });
    }

    const newExpense = db.create('expenses', {
      category,
      amount: parsedAmount,
      expenseDate: expenseDate || new Date().toISOString().split('T')[0],
      paymentMethod,
      description,
      recordedBy: req.user ? req.user.name : 'Admin'
    });

    logAudit({
      action: 'EXPENSE_RECORDED',
      reference: `EXP-${newExpense.id.slice(-6)}`,
      details: `Recorded expense of Rs. ${parsedAmount} for "${category}". Desc: ${description}`,
      entityType: 'expense',
      entityId: newExpense.id,
      user: req.user,
      ip: req.ip
    });

    res.status(201).json({ success: true, expense: newExpense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
};

exports.deleteExpense = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.findById('expenses', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    db.deleteById('expenses', id);

    logAudit({
      action: 'EXPENSE_DELETED',
      reference: id,
      details: `Deleted expense of Rs. ${existing.amount} (${existing.category})`,
      entityType: 'expense',
      entityId: id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
