const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,  // Ensure orderId is unique
      },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    items: [
        {
            description: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    status: { type: String, enum: ['paid', 'pending', 'failed'], default: 'pending' },
    date: { type: String, default: () => new Date().toLocaleString() },  // Set default value to current date
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who created the order
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
