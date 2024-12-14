const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema({
  counter: {
    type: Number,
    required: true, 
    default: 1,
  },
});

module.exports = mongoose.model('OrderCounter', orderCounterSchema);
 