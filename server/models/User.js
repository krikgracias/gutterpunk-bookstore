// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // Password won't be returned by default queries
  isAdmin: { type: Boolean, default: false },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  address: { // Default address for user profile (can be used as default shipping/billing)
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true }
  },
  phone: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving (pre-save hook)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash if password was modified
  const salt = await bcrypt.genSalt(10); // Generate a salt
  this.password = await bcrypt.hash(this.password, salt); // Hash the password
  next(); // Continue to save operation
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this' refers to the user document
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);