// server/routes/openLibrary.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); // Install: npm install axios

// GET /api/openlibrary/search?q=<query>
router.get('/search', async (req, res) => {
  const { q } = req.query; // Get the search query from the URL
  if (!q) {
    return res.status(400).json({ message: 'Search query (q) is required.' });
  }

  try {
    // Construct the Open Library API URL
    // 'q' for general search, 'q=title:', 'q=author:', 'q=isbn:' for specific fields
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}`;

    const response = await axios.get(openLibraryApiUrl);

    // Open Library's search API returns a 'docs' array with book data
    if (response.data && response.data.docs) {
      // You might want to filter or format the data here
      res.json(response.data); // Send the raw Open Library response
    } else {
      res.status(404).json({ message: 'No results found from Open Library.' });
    }
  } catch (error) {
    console.error('Error fetching from Open Library API:', error.message);
    // More specific error handling for Axios, e.g., error.response.status
    if (error.response) {
      res.status(error.response.status).json({ message: 'Error fetching data from Open Library.', details: error.response.data });
    } else {
      res.status(500).json({ message: 'Server error while searching Open Library.' });
    }
  }
});

module.exports = router;