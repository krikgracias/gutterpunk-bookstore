// server/models/Book.js
const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true }, // Added trim
  author: { type: String, required: true, trim: true }, // Added trim
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 }, // Added min value
  stock: { type: Number, default: 0, min: 0 }, // Default to 0, min 0
  isbn: { type: String, unique: true, sparse: true, trim: true }, // Added unique, sparse, trim
  sku: { type: String, trim: true }, // Keep SKU for internal tracking/Square, added trim
  tags: [String],
  categories: [String],
  coverImage: { type: String, trim: true }, // Added trim
  squareItemId: { type: String, unique: true, sparse: true, trim: true }, // Add unique, sparse, trim
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference User model
      rating: { type: Number, min: 1, max: 5, required: true }, // Rating constraints, added required
      comment: { type: String, trim: true }, // Added trim
      createdAt: { type: Date, default: Date.now } // Add review timestamp
    }
  ],
  publisher: { type: String, trim: true }, // Added trim
  publicationDate: Date, // Date type
  pageCount: { type: Number, min: 1 }, // Added min value
  format: { type: String, enum: ['Hardcover', 'Paperback', 'Ebook', 'Audiobook', 'Other'], trim: true }, // Added 'Other', trim
  language: { type: String, trim: true }, // Added trim
  // Fields for used books / trade-ins
  isUsed: { type: Boolean, default: false },
  condition: { // Required only if isUsed is true
    type: String,
    enum: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable'],
    required: function() { return this.isUsed; }
  },
  createdAt: { type: Date, default: Date.now }, // Add book creation timestamp
  updatedAt: { type: Date, default: Date.now } // Add book update timestamp
});

// Update 'updatedAt' on save
BookSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Book', BookSchema);