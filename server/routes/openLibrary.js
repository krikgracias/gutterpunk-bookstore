const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to extract and normalize ISBNs from various Open Library detail objects
function extractIsbns(detailData) {
    let isbns = [];
    if (detailData.isbn_13) {
        isbns = isbns.concat(detailData.isbn_13);
    }
    if (detailData.isbn_10) {
        isbns = isbns.concat(detailData.isbn_10);
    }
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
    const response = await axios.get(openLibraryApiUrl, { timeout: 8000 }); // Add timeout
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
// This route will try multiple strategies to find ISBNs for a given OLID
router.get('/details/:olid', async (req, res) => {
  const { olid } = req.params;
  if (!olid) {
    return res.status(400).json({ message: 'Open Library ID (olid) is required.' });
  }

  let finalIsbns = [];
  let detailedBookData = null;
  let debugLog = []; // To capture debugging messages for the frontend

  try {
    // Strategy 1: Direct fetch by OLID (works for both /works/ and /books/ types)
    debugLog.push(`Strategy 1: Attempting direct fetch for ${olid}.`);
    console.log(`[OL-DETAIL] Starting direct fetch for ${olid}`); // Log to Render console
    try {
      const directDetailsUrl = `https://openlibrary.org${olid}.json`;
      const directResponse = await axios.get(directDetailsUrl, { timeout: 8000 }); // Increased timeout
      detailedBookData = directResponse.data;
      finalIsbns = extractIsbns(detailedBookData);
      if (finalIsbns.length > 0) {
          debugLog.push(`Strategy 1: Found ISBNs directly.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, found ISBNs.`); // Log to Render console
          return res.json({ // Early exit if successful
              olid: olid,
              title: detailedBookData?.title,
              author: detailedBookData?.author_name || detailedBookData?.authors?.map(a => a.name).join(', '),
              publish_year: detailedBookData?.first_publish_year || detailedBookData?.publish_date?.substring(0,4),
              cover_i: detailedBookData?.covers?.[0] || detailedBookData?.cover_i,
              description: detailedBookData?.description?.value || detailedBookData?.description,
              isbns: finalIsbns,
              _debugLog: debugLog // Include debug log
          });
      } else {
          debugLog.push(`Strategy 1: No direct ISBNs found.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, but no ISBNs found.`); // Log to Render console
      }
    } catch (directError) {
        debugLog.push(`Strategy 1: Direct fetch failed - ${directError.message}.`);
        console.error(`[OL-DETAIL] Direct OLID fetch failed for ${olid}:`, directError.message); // Log to Render console
    }


    // Strategy 2: If it's a Work ID and no ISBNs yet, try to find an edition
    if (olid.startsWith('/works/') && finalIsbns.length === 0) {
      debugLog.push(`Strategy 2: Attempting editions fetch for work ${olid}.`);
      console.log(`[OL-DETAIL] Starting editions fetch for ${olid}`); // Log to Render console
      try {
        const editionsUrl = `https://openlibrary.org${olid}/editions.json`;
        const editionsResponse = await axios.get(editionsUrl, { timeout: 8000 }); // Increased timeout

        if (editionsResponse.data && editionsResponse.data.entries && editionsResponse.data.entries.length > 0) {
          for (const edition of editionsResponse.data.entries) { // Check all editions (or a larger slice)
            const editionIsbns = extractIsbns(edition);
            if (editionIsbns.length > 0) {
              finalIsbns = editionIsbns;
              // Merge edition data into detailedBookData for comprehensive response
              detailedBookData = { ...detailedBookData, ...edition }; // Keep the best overall book data
              debugLog.push(`Strategy 2: Found ISBNs in an edition.`);
              console.log(`[OL-DETAIL] Editions fetch successful for ${olid}, found ISBNs.`); // Log to Render console
              break;
            }
          }
        }
        if (finalIsbns.length === 0) {
            debugLog.push(`Strategy 2: Editions fetch successful, but no ISBNs found in any edition.`);
            console.log(`[OL-DETAIL] Editions fetch successful for ${olid}, but no ISBNs found in any edition.`); // Log to Render console
        }
      } catch (editionsError) {
          debugLog.push(`Strategy 2: Editions fetch failed - ${editionsError.message}.`);
          console.error(`[OL-DETAIL] Editions fetch failed for ${olid}:`, editionsError.message); // Log to Render console
      }
    }


    // Final Response based on all attempts
    if (finalIsbns.length > 0) {
        // Construct the response data with any details found (prioritizing found ISBNs)
        const responseData = {
            olid: olid,
            title: detailedBookData?.title,
            author: detailedBookData?.author_name || detailedBookData?.authors?.map(a => a.name).join(', '), // Handle both array and string authors
            publish_year: detailedBookData?.first_publish_year || detailedBookData?.publish_date?.substring(0,4),
            cover_i: detailedBookData?.covers?.[0] || detailedBookData?.cover_i, // Try multiple cover fields
            description: detailedBookData?.description?.value || detailedBookData?.description, // Description might be an object
            isbns: finalIsbns,
            _debugLog: debugLog // Include debug log in successful response
        };
        console.log(`[OL-DETAIL] Responding with found ISBNs for ${olid}.`); // Log to Render console
        res.json(responseData);
    } else {
        // If after all strategies, no ISBNs are found
        console.log(`[OL-DETAIL] Responding 404 for ${olid}: No ISBNs found after all strategies.`); // Log to Render console
        res.status(404).json({
            message: 'Details found but no ISBNs available for this Open Library ID after all attempts.',
            details: detailedBookData, // Send whatever details were found, even if no ISBNs
            _debugLog: debugLog // Include debug log in 404 response
        });
    }

  } catch (error) {
    // This catch block handles unexpected errors not caught by inner try-catches
    debugLog.push(`Unhandled error: ${error.message}`);
    console.error(`[OL-DETAIL] Unhandled error in /details/:olid for ${olid}:`, error); // Log to Render console
    if (error.response) {
      // If error.response exists, it came from Axios (Open Library)
      console.error(`[OL-DETAIL] Open Library Response Status: ${error.response.status}, Data:`, error.response.data); // Log to Render console
      res.status(error.response.status || 500).json({
          message: 'Error fetching detailed data from Open Library.',
          details: error.response.data || error.message,
          openLibraryUrlAttempted: `https://openlibrary.org${olid}.json`,
          _debugLog: debugLog
      });
    } else {
      // General server error (e.g., network issue before request could be sent)
      res.status(500).json({
          message: 'Server error while fetching Open Library details.',
          details: error.message,
          _debugLog: debugLog
      });
    }
  }
});

module.exports = router;