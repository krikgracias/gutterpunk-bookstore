// server/routes/cafe.js
const express = require('express');
const router = express.Router();
// Assuming you will create a model for CafeSettings or similar
// const CafeSettings = require('../models/CafeSettings');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/cafe/coffee-of-week
router.get('/coffee-of-week', async (req, res) => {
  try {
    // For now, return hardcoded data. Later, fetch from DB.
    const coffeeOfWeek = {
      name: "Rebel Roast Espresso",
      description: "A dark, bold blend with notes of defiance and a hint of rebellion.",
      price: 3.50,
      imageUrl: "https://via.placeholder.com/150x150?text=Rebel+Roast"
    };
    // Or, if fetching from a model:
    // const coffeeOfWeek = await CafeSettings.findOne({ type: 'coffeeOfWeek' });
    if (coffeeOfWeek) {
      res.json(coffeeOfWeek);
    } else {
      res.status(404).json({ message: 'No coffee of the week set.' });
    }
  } catch (err) {
    console.error('Error fetching coffee of the week:', err);
    res.status(500).json({ message: 'Server error fetching coffee of the week.' });
  }
});

// GET /api/cafe/daily-specials
router.get('/daily-specials', async (req, res) => {
  try {
    // For now, return hardcoded data. Later, fetch from DB.
    const dailySpecials = [
      { name: "Anarchist Avocado Toast", price: 7.99 },
      { name: "Revolutionary Red Lentil Soup", price: 6.50 }
    ];
    // Or, if fetching from a model:
    // const dailySpecials = await CafeSettings.findOne({ type: 'dailySpecials' });
    if (dailySpecials.length > 0) {
      res.json(dailySpecials);
    } else {
      res.status(404).json({ message: 'No daily specials set.' });
    }
  } catch (err) {
    console.error('Error fetching daily specials:', err);
    res.status(500).json({ message: 'Server error fetching daily specials.' });
  }
});

// Admin route to SET/UPDATE coffee of the week (optional for now, but good for future)
router.put('/coffee-of-week', protect, adminOnly, async (req, res) => {
    // Implement logic to save req.body to your CafeSettings model for coffeeOfWeek
    res.status(200).json({ message: 'Coffee of the week updated (mock).' });
});

// Admin route to SET/UPDATE daily specials (optional for now, but good for future)
router.put('/daily-specials', protect, adminOnly, async (req, res) => {
    // Implement logic to save req.body to your CafeSettings model for dailySpecials
    res.status(200).json({ message: 'Daily specials updated (mock).' });
});

module.exports = router;