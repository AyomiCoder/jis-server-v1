const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const {
    createOrder, 
    getOrders, 
    updateOrderStatus, 
    deleteOrder, 
    generateOrderInvoice, 
    generateOrdersReport, 
    getTransactionTotals, 
    getOrderCounts
    } = require('../controllers/orderController');

// Create Order (requires authentication)
router.post('/create-orders', authenticate, createOrder);

// Get Orders for the authenticated user (requires authentication)
router.get('/get-orders', authenticate, getOrders);

// Update Order Status (requires authentication
router.put('/status', authenticate, updateOrderStatus);

// Delete Order (requires authentication)
router.delete('/delete-order', authenticate, deleteOrder);

// Generate PDF for an individual order invoice (requires authentication)
router.get('/invoice/:orderId', authenticate, generateOrderInvoice);

// Generate PDF report for all orders (requires authentication)
router.get('/report', authenticate, generateOrdersReport);

// Get transactional totals (Paid, Pending, Failed) (requires authentication)
router.get('/transaction-totals', authenticate, getTransactionTotals);

// Get order counts by status (requires authentication)
router.get('/order-counts', authenticate, getOrderCounts);

module.exports = router;
