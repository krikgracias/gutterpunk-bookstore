// server/routes/admin.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Adjust path to models
const User = require('../models/User');   // Adjust path to models
const Book = require('../models/Book');   // Adjust path to models (if needed for admin book management routes here)
const { protect, adminOnly } = require('../middleware/auth'); // Adjust path to middleware

// --- Order Management (Admin Only) ---

// GET /api/admin/orders - View all orders
router.get('/orders', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email firstName lastName') // Populate user details
      .populate('items.bookId', 'title author isbn price') // Populate specific book details within items
      .sort({ createdAt: -1 }); // Sort by most recent first
    res.json(orders);
  } catch (err) {
    console.error('Error fetching all orders for admin:', err);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// GET /api/admin/orders/:id - View single order details
router.get('/orders/:id', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username email firstName lastName address phone') // Populate full user details
            .populate('items.bookId', 'title author isbn coverImage price'); // Populate full book details
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (err) {
        console.error('Error fetching single order for admin:', err);
        res.status(500).json({ message: 'Server error fetching order' });
    }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Validate new status against allowed enum values from Order model
    const allowedStatuses = Order.schema.path('status').enumValues;
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid order status provided. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// --- User Management (Admin Only) ---
// Note: Consider a separate 'user.js' route file for non-admin user profile updates

// GET /api/admin/users - View all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // Fetch all users, exclude passwords
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users for admin:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      // Prevent accidental deletion of other admin users
      if (user.isAdmin) {
        return res.status(403).json({ message: 'Cannot delete admin user.' });
      }
      await user.deleteOne(); // Use deleteOne()
      res.json({ message: 'User removed successfully.' });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// --- Book Trade-In/Submission Management (Admin Only) ---
// These routes are conceptual and depend on you creating a TradeInSubmission model and its route file.
/*
const TradeInSubmission = require('../models/TradeInSubmission'); // Assuming you create this model

// GET /api/admin/trade-ins - View all trade-in submissions
router.get('/trade-ins', protect, adminOnly, async (req, res) => {
    try {
        const submissions = await TradeInSubmission.find().sort({ createdAt: -1 });
        res.json(submissions);
    } catch (err) {
        console.error('Error fetching trade-in submissions:', err);
        res.status(500).json({ message: 'Server error fetching submissions' });
    }
});

// PUT /api/admin/trade-ins/:id/status - Update trade-in submission status or make an offer
router.put('/trade-ins/:id', protect, adminOnly, async (req, res) => {
    const { status, offerAmount, notes } = req.body;
    try {
        const submission = await TradeInSubmission.findById(req.params.id);
        if (!submission) return res.status(404).json({ message: 'Trade-in submission not found.' });

        if (status) submission.status = status;
        if (offerAmount) submission.ourOffer = offerAmount;
        if (notes) submission.adminNotes = notes; // Assuming an adminNotes field in the model

        await submission.save();
        res.json(submission);
    } catch (err) {
        console.error('Error updating trade-in submission:', err);
        res.status(500).json({ message: 'Server error updating submission.' });
    }
});
*/

module.exports = router;