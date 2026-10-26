const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'devloop_pos_jwt_super_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid token' });
    }

    const user = db.findById('users', decoded.id);
    if (!user || user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'User account disabled or not found' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    };
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Requires role: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
