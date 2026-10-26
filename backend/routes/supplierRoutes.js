const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, supplierController.getAllSuppliers);
router.get('/purchases/list', authenticateToken, supplierController.getAllPurchases);
router.get('/:id', authenticateToken, supplierController.getSupplierById);
router.post('/', authenticateToken, requireRole('admin', 'manager'), supplierController.createSupplier);
router.put('/:id', authenticateToken, requireRole('admin', 'manager'), supplierController.updateSupplier);
router.post('/purchases', authenticateToken, requireRole('admin', 'manager'), supplierController.createPurchase);
router.post('/:supplierId/payment', authenticateToken, requireRole('admin', 'manager'), supplierController.recordSupplierPayment);
router.get('/:supplierId/statement', authenticateToken, requireRole('admin', 'manager'), supplierController.getSupplierStatement);

module.exports = router;
