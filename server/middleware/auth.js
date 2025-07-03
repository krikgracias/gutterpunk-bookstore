// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path to models

const protect = async (req, res, next) => {
  let token;

  // Check for token in 'Authorization' header (Bearer Token format)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Extract token

      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify and decode token

      // Find user by ID from token, excluding the password field for security
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        // If user associated with token ID is not found in DB
        return res.status(404).json({ message: 'User not found for this token.' });
      }

      next(); // Proceed to the next middleware/route handler
    } catch (err) {
      console.error('Token verification error:', err.message); // Log the specific JWT error

      // Provide specific error messages based on JWT error type
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token. Not authorized.' });
      }
      // Generic error for other unexpected issues
      res.status(500).json({ message: 'Authentication failed. Please try again.' });
    }
  }

  // If no token was provided in the header
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

const adminOnly = (req, res, next) => {
  // This middleware assumes 'protect' has already run and successfully populated req.user
  if (req.user && req.user.isAdmin) {
    next(); // User is authenticated and is an admin, proceed
  } else {
    // User is not authenticated or not an admin
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { protect, adminOnly };