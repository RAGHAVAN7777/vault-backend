const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['normal', 'power', 'admin'],
    default: 'normal',
    required: true
  },
  mpinHash: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  recoveryOtp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
