<<<<<<< HEAD
// server/routes/books.js
const express = require('express');
const router = express.Router();
const Book = require('../models/Book'); // Adjust path to models
const { protect, adminOnly } = require('../middleware/auth'); // Adjust path to middleware

// GET /api/books - Get all books with optional search, category, and used status filters
router.get('/', async (req, res) => {
  try {
    const query = {}; // Initialize empty query object

    // Implement search functionality (case-insensitive across multiple fields)
    if (req.query.search) {
        query.$or = [
            { title: { $regex: req.query.search, $options: 'i' } },
            { author: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
            { tags: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // Filter by category (case-insensitive)
    if (req.query.category) {
        // Use $in with a regex to match categories array
        query.categories = { $in: [new RegExp(req.query.category, 'i')] };
    }

    // Filter by 'isUsed' status
    if (req.query.isUsed !== undefined) { // Check if parameter exists
        query.isUsed = (req.query.isUsed === 'true'); // Convert string 'true'/'false' to boolean
    }

    // Pagination (optional, but good for large inventories)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const books = await Book.find(query)
                            .skip(skip)
                            .limit(limit)
                            .sort({ createdAt: -1 }); // Default sort by newest

    const totalBooks = await Book.countDocuments(query); // Get total count for pagination info

    res.json({
        books,
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalBooks
    });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Server error fetching books.' });
  }
});

// GET /api/books/featured - Get a subset of books for homepage display
router.get('/featured', async (req, res) => {
    try {
        // Define your logic for "featured" books:
        // Example 1: Latest arrivals
        const featuredBooks = await Book.find().sort({ createdAt: -1 }).limit(8); // Get the 8 newest books
        // Example 2: Books marked as "featured" (requires adding a 'isFeatured: Boolean' field to Book model)
        // const featuredBooks = await Book.find({ isFeatured: true }).limit(8);
        res.json(featuredBooks);
    } catch (err) {
        console.error('Error fetching featured books:', err);
        res.status(500).json({ message: 'Server error fetching featured books.' });
    }
});


// GET /api/books/:id - Get a single book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(book);
  } catch (err) {
    console.error('Error fetching single book:', err);
    // Handle CastError for invalid IDs
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid book ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching book.' });
  }
});

// POST /api/books - Create a new book (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    res.status(201).json(savedBook); // Respond with the newly created book
  } catch (err) {
    console.error('Error creating book:', err);
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    // Handle duplicate key errors (e.g., duplicate ISBN or Square Item ID)
    if (err.code === 11000) {
        return res.status(400).json({ message: 'A book with this ISBN or Square Item ID already exists.' });
    }
    res.status(500).json({ message: 'Server error creating book.' });
  }
});

// PUT /api/books/:id - Update an existing book (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    // Find and update the book. `new: true` returns the updated document. `runValidators: true` ensures schema validation on update.
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedBook) return res.status(404).json({ message: 'Book not found.' });
    res.json(updatedBook);
  } catch (err) {
    console.error('Error updating book:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
        return res.status(400).json({ message: 'Another book with this ISBN or Square Item ID already exists.' });
    }
    res.status(500).json({ message: 'Server error updating book.' });
  }
});

// DELETE /api/books/:id - Delete a book (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) return res.status(404).json({ message: 'Book not found.' });
    res.json({ message: 'Book deleted successfully.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ message: 'Server error deleting book.' });
  }
});

=======
// server/routes/books.js
const express = require('express');
const router = express.Router();
const Book = require('../models/Book'); // Adjust path to models
const { protect, adminOnly } = require('../middleware/auth'); // Adjust path to middleware

// GET /api/books - Get all books with optional search, category, and used status filters
router.get('/', async (req, res) => {
  try {
    const query = {}; // Initialize empty query object

    // Implement search functionality (case-insensitive across multiple fields)
    if (req.query.search) {
        query.$or = [
            { title: { $regex: req.query.search, $options: 'i' } },
            { author: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
            { tags: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // Filter by category (case-insensitive)
    if (req.query.category) {
        // Use $in with a regex to match categories array
        query.categories = { $in: [new RegExp(req.query.category, 'i')] };
    }

    // Filter by 'isUsed' status
    if (req.query.isUsed !== undefined) { // Check if parameter exists
        query.isUsed = (req.query.isUsed === 'true'); // Convert string 'true'/'false' to boolean
    }

    // Pagination (optional, but good for large inventories)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const books = await Book.find(query)
                            .skip(skip)
                            .limit(limit)
                            .sort({ createdAt: -1 }); // Default sort by newest

    const totalBooks = await Book.countDocuments(query); // Get total count for pagination info

    res.json({
        books,
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalBooks
    });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Server error fetching books.' });
  }
});

// GET /api/books/featured - Get a subset of books for homepage display
router.get('/featured', async (req, res) => {
    try {
        // Define your logic for "featured" books:
        // Example 1: Latest arrivals
        const featuredBooks = await Book.find().sort({ createdAt: -1 }).limit(8); // Get the 8 newest books
        // Example 2: Books marked as "featured" (requires adding a 'isFeatured: Boolean' field to Book model)
        // const featuredBooks = await Book.find({ isFeatured: true }).limit(8);
        res.json(featuredBooks);
    } catch (err) {
        console.error('Error fetching featured books:', err);
        res.status(500).json({ message: 'Server error fetching featured books.' });
    }
});


// GET /api/books/:id - Get a single book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(book);
  } catch (err) {
    console.error('Error fetching single book:', err);
    // Handle CastError for invalid IDs
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid book ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching book.' });
  }
});

// POST /api/books - Create a new book (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    res.status(201).json(savedBook); // Respond with the newly created book
  } catch (err) {
    console.error('Error creating book:', err);
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    // Handle duplicate key errors (e.g., duplicate ISBN or Square Item ID)
    if (err.code === 11000) {
        return res.status(400).json({ message: 'A book with this ISBN or Square Item ID already exists.' });
    }
    res.status(500).json({ message: 'Server error creating book.' });
  }
});

// PUT /api/books/:id - Update an existing book (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    // Find and update the book. `new: true` returns the updated document. `runValidators: true` ensures schema validation on update.
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedBook) return res.status(404).json({ message: 'Book not found.' });
    res.json(updatedBook);
  } catch (err) {
    console.error('Error updating book:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
        return res.status(400).json({ message: 'Another book with this ISBN or Square Item ID already exists.' });
    }
    res.status(500).json({ message: 'Server error updating book.' });
  }
});

// DELETE /api/books/:id - Delete a book (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) return res.status(404).json({ message: 'Book not found.' });
    res.json({ message: 'Book deleted successfully.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ message: 'Server error deleting book.' });
  }
});

>>>>>>> 2df1c2dee2f9cf22350da6bcb1f3c8273a3b2c4e
module.exports = router;