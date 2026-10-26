const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { verifySupervisorPin } = require('../middleware/pinAuth');

router.get('/metrics', authenticateToken, inventoryController.getInventoryMetrics);
router.get('/history/:productId', authenticateToken, inventoryController.getProductStockHistory);
router.post('/adjust', authenticateToken, requireRole('admin', 'manager', 'inventory_staff'), inventoryController.adjustStock);
router.post('/reconcile', authenticateToken, requireRole('admin', 'manager', 'inventory_staff'), inventoryController.reconcileInventory);
router.post('/bulk-import', authenticateToken, requireRole('admin', 'manager'), inventoryController.bulkImportProducts);

module.exports = router;
