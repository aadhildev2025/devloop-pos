const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, productController.getAllProducts);
router.get('/barcode/generate', authenticateToken, productController.generateBarcode);
router.get('/barcode/render/:text', authenticateToken, productController.renderBarcode);
router.get('/barcode/:barcode', authenticateToken, productController.getProductByBarcode);
router.get('/:id', authenticateToken, productController.getProductById);

router.post('/', authenticateToken, requireRole('admin', 'manager', 'inventory_staff'), productController.createProduct);
router.put('/:id', authenticateToken, requireRole('admin', 'manager', 'inventory_staff'), productController.updateProduct);
router.delete('/:id', authenticateToken, requireRole('admin', 'manager'), productController.deleteProduct);

module.exports = router;
