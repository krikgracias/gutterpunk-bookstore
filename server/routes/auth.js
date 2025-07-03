<<<<<<< HEAD
// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path to models
const router = express.Router();

// Helper: Generate JWT token for a user
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin }, // Payload: user ID and admin status
    process.env.JWT_SECRET, // Secret key from environment variables
    { expiresIn: '7d' } // Token expiration time (e.g., 7 days)
  );
};

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body; // Destructure required fields from request body
  try {
    // Check if a user with the provided email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create a new user document in the database
    const user = await User.create({ username, email, password });

    // Respond with created user's basic info and a generated JWT token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin, // Include admin status in the response
      token: generateToken(user) // Return the JWT token
    });
  } catch (err) {
    console.error('Register error:', err); // Log the full error for debugging
    // Handle specific Mongoose validation errors if needed, otherwise send generic server error
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login - Authenticate user and return JWT token
router.post('/login', async (req, res) => {
  const { email, password } = req.body; // Destructure email and password
  try {
    // Find the user by email and explicitly select the password for comparison
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and if the provided password matches the stored hashed password
    if (user && await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin, // Include admin status in the response
        token: generateToken(user) // Return the JWT token
      });
    } else {
      // If user not found or password doesn't match
      res.status(401).json({ message: 'Invalid email or password.' }); // Generic error for security
    }
  } catch (err) {
    console.error('Login error:', err); // Log the full error
    res.status(500).json({ message: 'Server error during login.' });
  }
});

=======
// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path to models
const router = express.Router();

// Helper: Generate JWT token for a user
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin }, // Payload: user ID and admin status
    process.env.JWT_SECRET, // Secret key from environment variables
    { expiresIn: '7d' } // Token expiration time (e.g., 7 days)
  );
};

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body; // Destructure required fields from request body
  try {
    // Check if a user with the provided email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create a new user document in the database
    const user = await User.create({ username, email, password });

    // Respond with created user's basic info and a generated JWT token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin, // Include admin status in the response
      token: generateToken(user) // Return the JWT token
    });
  } catch (err) {
    console.error('Register error:', err); // Log the full error for debugging
    // Handle specific Mongoose validation errors if needed, otherwise send generic server error
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login - Authenticate user and return JWT token
router.post('/login', async (req, res) => {
  const { email, password } = req.body; // Destructure email and password
  try {
    // Find the user by email and explicitly select the password for comparison
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and if the provided password matches the stored hashed password
    if (user && await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin, // Include admin status in the response
        token: generateToken(user) // Return the JWT token
      });
    } else {
      // If user not found or password doesn't match
      res.status(401).json({ message: 'Invalid email or password.' }); // Generic error for security
    }
  } catch (err) {
    console.error('Login error:', err); // Log the full error
    res.status(500).json({ message: 'Server error during login.' });
  }
});

>>>>>>> 2df1c2dee2f9cf22350da6bcb1f3c8273a3b2c4e
module.exports = router;