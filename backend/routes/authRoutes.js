const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/unlock-pin', authenticateToken, authController.unlockWithPin);
router.post('/verify-supervisor', authenticateToken, authController.verifySupervisor);
router.get('/me', authenticateToken, authController.getMe);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/change-pin', authenticateToken, authController.changePin);

module.exports = router;
