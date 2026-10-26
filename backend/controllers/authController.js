const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = db.findOne('users', { username: username.trim().toLowerCase() }) ||
                 db.find('users').find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user || user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Invalid username or account disabled' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logAudit({
        action: 'FAILED_LOGIN_ATTEMPT',
        reference: user.username,
        details: 'Incorrect password entered',
        entityType: 'user',
        entityId: user.id,
        user: { id: user.id, name: user.name, role: user.role },
        ip: req.ip
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    logAudit({
      action: 'USER_LOGIN',
      reference: user.username,
      details: `User ${user.name} logged in successfully`,
      entityType: 'user',
      entityId: user.id,
      user: { id: user.id, name: user.name, role: user.role },
      ip: req.ip
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.unlockWithPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    // Match against current user's PIN or any supervisor PIN
    const currentUser = db.findById('users', req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(String(pin), currentUser.pin);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN' });
    }

    res.json({
      success: true,
      message: 'Session unlocked',
      user: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        role: currentUser.role
      }
    });
  } catch (err) {
    console.error('PIN unlock error:', err);
    res.status(500).json({ success: false, message: 'Error verifying PIN' });
  }
};

exports.verifySupervisor = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Supervisor PIN is required' });
    }

    const supervisors = db.find('users').filter(
      u => (u.role === 'admin' || u.role === 'manager') && u.status !== 'inactive'
    );

    let verified = null;
    for (const supervisor of supervisors) {
      if (supervisor.pin) {
        const match = await bcrypt.compare(String(pin), supervisor.pin);
        if (match) {
          verified = supervisor;
          break;
        }
      }
    }

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid Supervisor PIN' });
    }

    logAudit({
      action: 'SUPERVISOR_PIN_VERIFIED',
      reference: verified.username,
      details: `Action authorized by supervisor ${verified.name}`,
      entityType: 'user',
      entityId: verified.id,
      user: req.user,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Authorized by ' + verified.name,
      supervisor: {
        id: verified.id,
        name: verified.name,
        role: verified.role
      }
    });
  } catch (err) {
    console.error('Supervisor verification error:', err);
    res.status(500).json({ success: false, message: 'Error checking supervisor PIN' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = db.findById('users', req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both old and new passwords are required' });
    }

    const user = db.findById('users', req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.updateById('users', user.id, { password: hashed });

    logAudit({
      action: 'PASSWORD_CHANGED',
      reference: user.username,
      details: 'User updated their password',
      entityType: 'user',
      entityId: user.id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
};

exports.changePin = async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || String(newPin).length < 4) {
      return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
    }

    const hashedPin = await bcrypt.hash(String(newPin), 10);
    db.updateById('users', req.user.id, { pin: hashedPin });

    logAudit({
      action: 'PIN_CHANGED',
      reference: req.user.username,
      details: 'User updated their security PIN',
      entityType: 'user',
      entityId: req.user.id,
      user: req.user,
      ip: req.ip
    });

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating PIN' });
  }
};
