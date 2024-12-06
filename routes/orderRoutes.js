const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const {createOrder, getOrders, updateOrderStatus, deleteOrder} = require('../controllers/orderController');

// Create Order (requires authentication)
router.post('/create-orders', authenticate, createOrder);

// Get Orders for the authenticated user (requires authentication)
router.get('/get-orders', authenticate, getOrders);

// Update Order Status (requires authentication
router.put('/status', authenticate, updateOrderStatus);

// Delete Order (requires authentication)
router.delete('/delete-order', authenticate, deleteOrder);

module.exports = router;
