// server/routes/order.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Adjust path to models
const Cart = require('../models/Cart');   // Adjust path to models
const Book = require('../models/Book');   // Adjust path to models (for stock updates)
const { protect } = require('../middleware/auth'); // Adjust path to middleware
const mongoose = require('mongoose'); // Import mongoose for transaction sessions

// POST /api/orders/checkout - Create an order from the user's cart
router.post('/checkout', protect, async (req, res) => {
  const userId = req.user._id;
  // Destructure potential shipping/billing/payment details from request body
  const { shippingAddress, billingAddress, paymentMethod, transactionId } = req.body;

  const session = await mongoose.startSession(); // Start a Mongoose session for ACID transactions
  session.startTransaction(); // Begin the transaction

  try {
    const cart = await Cart.findOne({ userId }).populate('items.bookId').session(session); // Find cart within transaction
    if (!cart || cart.items.length === 0) {
      throw new Error('Your cart is empty.'); // Use throw for early exit and transaction rollback
    }

    const orderItems = [];
    let total = 0;

    // Iterate through cart items to prepare order items and update book stock
    for (const item of cart.items) {
      const book = await Book.findById(item.bookId._id).session(session); // Get book within transaction

      // Basic validation: Check if book exists and has enough stock
      if (!book) {
        throw new Error(`Book with ID ${item.bookId._id} not found for checkout.`);
      }
      if (book.stock < item.quantity) {
        throw new Error(`Not enough stock for "${book.title}". Available: ${book.stock}, Requested: ${item.quantity}.`);
      }

      // Decrement book stock
      book.stock -= item.quantity;
      await book.save({ session }); // Save book changes within the current transaction

      // Prepare item data for the order
      orderItems.push({
        bookId: item.bookId._id,
        quantity: item.quantity,
        priceAtPurchase: book.price // Capture the current price of the book
      });
      total += book.price * item.quantity;
    }

    // Create the new order document
    const order = new Order({
      user: userId,
      items: orderItems,
      total,
      // Use provided addresses or user's default address if available (assuming User model has address)
      shippingAddress: shippingAddress || req.user.address,
      billingAddress: billingAddress || req.user.address,
      paymentMethod, // Captured from request body (e.g., 'Credit Card', 'PayPal')
      transactionId, // Captured after actual payment processing
      status: 'Pending' // Initial status before payment confirmation
    });

    // --- IMPORTANT: REAL PAYMENT GATEWAY INTEGRATION WOULD GO HERE ---
    // At this point, you would typically integrate with a payment service (e.g., Square Payments API, Stripe).
    // The payment processing result would determine if the order status is 'Paid' or if the transaction needs to be aborted.
    // For this mock, we'll simulate success:
    order.status = 'Paid'; // Assuming payment is successful for the mock

    await order.save({ session }); // Save the order within the transaction

    // Clear the user's cart after successful order creation
    await Cart.deleteOne({ userId }).session(session);

    await session.commitTransaction(); // Commit the transaction if all operations succeed
    res.status(201).json(order); // Respond with the created order

  } catch (err) {
    // If any error occurs, abort the transaction to rollback changes
    await session.abortTransaction();
    console.error('Checkout error:', err.message); // Log the specific error message
    // Send appropriate error response to the client
    res.status(400).json({ message: err.message || 'Server error during checkout process.' });
  } finally {
    session.endSession(); // Always end the session
  }
});

// GET /api/orders/my-orders - Get a logged-in user’s order history
router.get('/my-orders', protect, async (req, res) => {
  try {
    // Find all orders for the current user, populate book details, and sort by creation date
    const orders = await Order.find({ user: req.user._id })
                               .populate('items.bookId', 'title author coverImage price') // Populate specific fields of the ordered books
                               .sort({ createdAt: -1 }); // Sort by newest first
    res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ message: 'Server error fetching your orders.' });
  }
});

module.exports = router;