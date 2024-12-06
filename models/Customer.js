const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Refs to User models
  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
