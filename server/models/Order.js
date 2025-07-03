// server/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
      quantity: { type: Number, required: true },
      priceAtPurchase: { type: Number, required: true } // Ensure this is captured from book price at order creation
    }
  ],
  total: { type: Number, required: true, min: 0 }, // Added min value
  shippingAddress: { // Add shipping details
    street: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    zip: { type: String, trim: true, required: true },
    country: { type: String, trim: true, default: 'USA' } // Default for Hernando County context
  },
  billingAddress: { // Add billing details (can be same as shipping)
    street: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    zip: { type: String, trim: true, required: true },
    country: { type: String, trim: true, default: 'USA' }
  },
  paymentMethod: { type: String, trim: true }, // e.g., 'Square', 'PayPal', 'Credit Card'
  transactionId: { type: String, unique: true, sparse: true, trim: true }, // ID from payment gateway, unique if exists
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update 'updatedAt' on save
OrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', OrderSchema);