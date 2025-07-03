<<<<<<< HEAD
// server/models/Cart.js
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true }, // Unique cart per user
  items: [
    {
      bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
      quantity: { type: Number, default: 1, min: 1 }, // Default quantity, min 1
      priceAtTimeOfAdd: { type: Number, required: true } // Store price to handle changes, added required
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // Track updates
});

// Update 'updatedAt' on save
CartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

=======
// server/models/Cart.js
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true }, // Unique cart per user
  items: [
    {
      bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
      quantity: { type: Number, default: 1, min: 1 }, // Default quantity, min 1
      priceAtTimeOfAdd: { type: Number, required: true } // Store price to handle changes, added required
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // Track updates
});

// Update 'updatedAt' on save
CartSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

>>>>>>> 2df1c2dee2f9cf22350da6bcb1f3c8273a3b2c4e
module.exports = mongoose.model('Cart', CartSchema);