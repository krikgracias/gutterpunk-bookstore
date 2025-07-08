// server/routes/openLibrary.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to extract and normalize ISBNs from a given Open Library detail object
function extractIsbns(detailData) {
    let isbns = [];
    if (detailData.isbn_13) {
        isbns = isbns.concat(detailData.isbn_13);
    }
    if (detailData.isbn_10) {
        isbns = isbns.concat(detailData.isbn_10);
    }
    // Often, older or alternative identifiers might be available
    if (detailData.lccn) { // Library of Congress Control Number
        isbns = isbns.concat(detailData.lccn);
    }
    if (detailData.oclc_id) { // OCLC number
        isbns = isbns.concat(detailData.oclc_id);
    }
    return [...new Set(isbns)].filter(Boolean); // Get unique, non-empty ISBNs
}

// GET /api/openlibrary/search?q=<query> (Existing search route - no change needed here)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query (q) is required.' });
  }

  try {
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}`;
    const response = await axios.get(openLibraryApiUrl);

    if (response.data && response.data.docs) {
      res.json(response.data);
    } else {
      res.status(404).json({ message: 'No results found from Open Library.' });
    }
  } catch (error) {
    console.error('Error fetching from Open Library Search API:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ message: 'Error fetching data from Open Library search.', details: error.response.data });
    } else {
      res.status(500).json({ message: 'Server error while searching Open Library.' });
    }
  }
});

// UPDATED ROUTE: GET /api/openlibrary/details/:olid
// This route will now handle both Work and Edition IDs to find ISBNs
router.get('/details/:olid', async (req, res) => {
  const { olid } = req.params;
  if (!olid) {
    return res.status(400).json({ message: 'Open Library ID (olid) is required.' });
  }

  let finalIsbns = [];
  let detailedBookData = null;

  try {
    // 1. First, try to fetch details directly for the provided OLID
    // This works if it's an Edition (/books/...) or a Work with direct data
    const directDetailsUrl = `https://openlibrary.org${olid}.json`;
    const directResponse = await axios.get(directDetailsUrl);
    detailedBookData = directResponse.data;
    finalIsbns = extractIsbns(detailedBookData);

    // 2. If it's a Work ID and we still don't have ISBNs, try to find an edition
    if (olid.startsWith('/works/') && finalIsbns.length === 0) {
      console.log(`No direct ISBNs for work ${olid}. Attempting to find editions...`);
      const editionsUrl = `https://openlibrary.org${olid}/editions.json`; // Get editions of this work
      const editionsResponse = await axios.get(editionsUrl);

      if (editionsResponse.data && editionsResponse.data.entries && editionsResponse.data.entries.length > 0) {
        // Try to get ISBNs from the first few editions (or loop through all)
        for (const edition of editionsResponse.data.entries.slice(0, 5)) { // Check first 5 editions
          if (edition.isbn_13 || edition.isbn_10) {
            finalIsbns = extractIsbns(edition);
            detailedBookData = { ...detailedBookData, ...edition }; // Merge detail data
            break; // Found ISBNs in an edition, stop searching
          }
        }
      }
    }

    // Prepare response data
    const responseData = {
        olid: olid,
        title: detailedBookData?.title,
        author: detailedBookData?.author_name || detailedBookData?.authors?.map(a => a.name).join(', '),
        publish_year: detailedBookData?.first_publish_year || detailedBookData?.publish_date?.substring(0,4),
        cover_i: detailedBookData?.covers?.[0] || detailedBookData?.cover_i, // Try multiple cover fields
        description: detailedBookData?.description?.value || detailedBookData?.description, // Description might be an object
        isbns: finalIsbns,
        // Add other relevant fields you might want to send to frontend
    };

    if (finalIsbns.length > 0 || detailedBookData) {
      res.json(responseData);
    } else {
      res.status(404).json({ message: 'Details not found or no ISBNs available for this Open Library ID.' });
    }

  } catch (error) {
    console.error(`Error fetching from Open Library Details API for OLID ${olid}:`, error.message);
    if (error.response) {
      // Log the specific status and data from Open Library if available
      console.error(`Open Library Response Status: ${error.response.status}, Data:`, error.response.data);
      res.status(error.response.status).json({
          message: 'Error fetching detailed data from Open Library.',
          details: error.response.data || error.message,
          openLibraryUrlAttempted: `https://openlibrary.org${olid}.json`
      });
    } else {
      res.status(500).json({ message: 'Server error while fetching Open Library details.', details: error.message });
    }
  }
});

module.exports = router;