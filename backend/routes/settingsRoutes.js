const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Business & store settings
router.get('/', authenticateToken, settingsController.getSettings);
router.put('/', authenticateToken, requireRole('admin'), settingsController.updateSettings);

// User accounts management
router.get('/users', authenticateToken, requireRole('admin'), settingsController.getAllUsers);
router.post('/users', authenticateToken, requireRole('admin'), settingsController.createUser);
router.put('/users/:id', authenticateToken, requireRole('admin'), settingsController.updateUser);
router.delete('/users/:id', authenticateToken, requireRole('admin'), settingsController.deleteUser);

// Database backup & restore
router.get('/backup/export', authenticateToken, requireRole('admin'), settingsController.exportBackup);
router.post('/backup/restore', authenticateToken, requireRole('admin'), settingsController.restoreBackup);
router.post('/backup/reset-sample', authenticateToken, requireRole('admin'), settingsController.resetSampleData);
router.post('/backup/clear-database', authenticateToken, requireRole('admin'), settingsController.clearDatabase);

module.exports = router;
