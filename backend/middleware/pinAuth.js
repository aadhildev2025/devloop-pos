const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Verify if a supervisor/admin PIN is provided and valid
async function verifySupervisorPin(req, res, next) {
  const pin = req.headers['x-supervisor-pin'] || req.body.supervisorPin;

  // If user is already Admin or Manager, they can proceed without external pin OR with their own PIN
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    req.supervisor = req.user;
    return next();
  }

  if (!pin) {
    return res.status(403).json({
      success: false,
      requiresPin: true,
      message: 'Supervisor authorization PIN required for this action'
    });
  }

  // Find all active admin or manager users
  const supervisors = db.find('users').filter(
    u => (u.role === 'admin' || u.role === 'manager') && u.status !== 'inactive'
  );

  let verifiedUser = null;
  for (const supervisor of supervisors) {
    if (supervisor.pin) {
      const match = await bcrypt.compare(String(pin), supervisor.pin);
      if (match) {
        verifiedUser = supervisor;
        break;
      }
    }
  }

  if (!verifiedUser) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Supervisor PIN. Action rejected.'
    });
  }

  req.supervisor = {
    id: verifiedUser.id,
    name: verifiedUser.name,
    role: verifiedUser.role
  };
  next();
}

module.exports = { verifySupervisorPin };
