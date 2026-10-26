const db = require('../config/db');

exports.getAuditLogs = (req, res) => {
  try {
    const { fromDate, toDate, action, userId, search } = req.query;
    let logs = db.find('auditLogs');

    if (fromDate) {
      logs = logs.filter(l => l.createdAt >= `${fromDate}T00:00:00`);
    }
    if (toDate) {
      logs = logs.filter(l => l.createdAt <= `${toDate}T23:59:59`);
    }
    if (action && action !== 'all') {
      logs = logs.filter(l => l.action === action);
    }
    if (userId && userId !== 'all') {
      logs = logs.filter(l => l.userId === userId);
    }
    if (search) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(l =>
        (l.reference && l.reference.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q))
      );
    }

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Gather distinct action types for filter dropdown
    const allActions = Array.from(new Set(db.find('auditLogs').map(l => l.action)));

    res.json({
      success: true,
      count: logs.length,
      availableActions: allActions,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve audit trail' });
  }
};
