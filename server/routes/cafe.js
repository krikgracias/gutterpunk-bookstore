// server/routes/cafe.js
const express = require('express');
const router = express.Router();
const CafeSetting = require('../models/CafeSetting'); // Import the new model
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/cafe/coffee-of-week
router.get('/coffee-of-week', async (req, res) => {
  try {
    const coffeeOfWeek = await CafeSetting.findOne({ key: 'coffeeOfWeek' });
    if (coffeeOfWeek && coffeeOfWeek.value) { // Check if found and value exists
      res.json(coffeeOfWeek.value); // Return the 'value' field
    } else {
      res.status(404).json({ message: 'Coffee of the week not set.' });
    }
  } catch (err) {
    console.error('Error fetching coffee of the week:', err);
    res.status(500).json({ message: 'Server error fetching coffee of the week.' });
  }
});

// GET /api/cafe/daily-specials
router.get('/daily-specials', async (req, res) => {
  try {
    const dailySpecials = await CafeSetting.findOne({ key: 'dailySpecials' });
    if (dailySpecials && dailySpecials.value) { // Check if found and value exists
      res.json(dailySpecials.value); // Return the 'value' field
    } else {
      res.status(404).json({ message: 'No daily specials set.' });
    }
  } catch (err) {
    console.error('Error fetching daily specials:', err);
    res.status(500).json({ message: 'Server error fetching daily specials.' });
  }
});

// Admin Route: PUT /api/cafe/coffee-of-week (Set/Update Coffee of the Week)
router.put('/coffee-of-week', protect, adminOnly, async (req, res) => {
  const { name, description, price, imageUrl } = req.body; // Expect these fields for coffee
  if (!name || !description || !price) {
    return res.status(400).json({ message: 'Name, description, and price are required for coffee of the week.' });
  }
  try {
    const updatedCoffee = await CafeSetting.findOneAndUpdate(
      { key: 'coffeeOfWeek' },
      { value: { name, description, price, imageUrl } },
      { new: true, upsert: true, runValidators: true } // upsert: true creates if not exists
    );
    res.json(updatedCoffee.value);
  } catch (err) {
    console.error('Error updating coffee of the week:', err);
    res.status(500).json({ message: 'Server error updating coffee of the week.' });
  }
});

// Admin Route: PUT /api/cafe/daily-specials (Set/Update Daily Specials)
router.put('/daily-specials', protect, adminOnly, async (req, res) => {
  const specials = req.body; // Expect an array of objects: [{ name, price }]
  if (!Array.isArray(specials) || !specials.every(s => s.name && typeof s.price === 'number')) {
    return res.status(400).json({ message: 'Daily specials must be an array of objects with name and price.' });
  }
  try {
    const updatedSpecials = await CafeSetting.findOneAndUpdate(
      { key: 'dailySpecials' },
      { value: specials },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updatedSpecials.value);
  } catch (err) {
    console.error('Error updating daily specials:', err);
    res.status(500).json({ message: 'Server error updating daily specials.' });
  }
});

module.exports = router;