const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    businessName: { type: String, required: true },
    businessType: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
