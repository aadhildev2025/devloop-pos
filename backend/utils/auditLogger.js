const db = require('../config/db');

function logAudit({
  action,
  reference = '',
  details = '',
  entityType = '',
  entityId = '',
  user = null,
  ip = ''
}) {
  try {
    const entry = {
      action,
      reference,
      details,
      entityType,
      entityId,
      userId: user ? user.id : 'system',
      userName: user ? (user.name || user.username) : 'System',
      userRole: user ? user.role : 'system',
      ip: ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    };
    return db.create('auditLogs', entry);
  } catch (err) {
    console.error('Audit log creation error:', err);
  }
}

module.exports = { logAudit };
