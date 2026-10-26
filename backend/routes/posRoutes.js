const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { verifySupervisorPin } = require('../middleware/pinAuth');

router.post('/sale', authenticateToken, posController.createSale);
router.get('/invoice/:invoiceNumber', authenticateToken, posController.getSaleByInvoice);
router.get('/recent', authenticateToken, posController.getRecentSales);

// Hold carts
router.post('/hold', authenticateToken, posController.holdSale);
router.get('/held', authenticateToken, posController.getHeldSales);
router.delete('/held/:id', authenticateToken, posController.deleteHeldSale);

// Refund / Return (requires supervisor authorization)
router.post('/refund/:invoiceNumber', authenticateToken, verifySupervisorPin, posController.processRefund);

module.exports = router;
