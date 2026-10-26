const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, customerController.getAllCustomers);
router.get('/:id', authenticateToken, customerController.getCustomerById);
router.post('/', authenticateToken, customerController.createCustomer);
router.put('/:id', authenticateToken, customerController.updateCustomer);
router.post('/:customerId/payment', authenticateToken, customerController.recordCustomerPayment);
router.get('/:customerId/statement', authenticateToken, customerController.getCustomerStatement);

module.exports = router;
