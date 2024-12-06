const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema({
  counter: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = mongoose.model('OrderCounter', orderCounterSchema);
