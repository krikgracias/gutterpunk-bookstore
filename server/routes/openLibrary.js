const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to extract and normalize ISBNs from various Open Library detail objects
// This now specifically looks for the 'identifiers' object as per API docs
function extractIsbns(detailData) {
    let isbns = [];
    const identifiers = detailData.identifiers; // Access the identifiers object

    if (identifiers) { // Check if the identifiers object exists
        if (identifiers.isbn_13) {
            isbns = isbns.concat(identifiers.isbn_13);
        }
        if (identifiers.isbn_10) {
            isbns = isbns.concat(identifiers.isbn_10);
        }
        if (identifiers.lccn) {
            isbns = isbns.concat(identifiers.lccn);
        }
        if (identifiers.oclc) { // Use 'oclc' as per docs, not 'oclc_id'
            isbns = isbns.concat(identifiers.oclc);
        }
        // Add goodreads, amazon, etc., from identifiers if you want them in the combined list
        // if (identifiers.goodreads) { isbns = isbns.concat(identifiers.goodreads); }
        // if (identifiers.amazon) { isbns = isbns.concat(identifiers.amazon); }
    }
    // Also include top-level ISBNs from search results if they exist (though less common for comprehensive data)
    // These conditions ensure we only add if 'identifiers' object wasn't processed (to avoid duplicates/errors)
    if (detailData.isbn_13 && !identifiers) {
        isbns = isbns.concat(detailData.isbn_13);
    }
    if (detailData.isbn_10 && !identifiers) {
        isbns = isbns.concat(detailData.isbn_10);
    }
    if (detailData.lccn && !identifiers) {
        isbns = isbns.concat(detailData.lccn);
    }
    if (detailData.oclc_id && !identifiers) { // Keep this for compatibility if 'oclc_id' is sometimes at top level
        isbns = isbns.concat(detailData.oclc_id);
    }

    return [...new Set(isbns)].filter(Boolean); // Get unique, non-empty ISBNs
}

// UPDATED ROUTE: GET /api/openlibrary/search?q=<query>
// This route now uses the 'fields' parameter to get edition details directly
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query (q) is required.' });
  }

  try {
    // Request editions details directly in the initial search using the 'fields' parameter
    // We request general fields, plus specific edition fields
    const fields = 'key,title,author_name,first_publish_year,cover_i,isbn,editions.key,editions.title,editions.isbn,editions.publishers,editions.publish_date,editions.number_of_pages,editions.physical_format,editions.languages,editions.description,editions.lccn,editions.oclc,subjects'; // Added 'subjects' and more detail
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=${fields}&limit=50`; // Increased limit for more results
    const response = await axios.get(openLibraryApiUrl, { timeout: 10000 }); // Increased timeout for larger response

    if (response.data && response.data.docs) {
      const processedDocs = response.data.docs.map(doc => {
        let bestEditionData = null;
        let combinedIsbns = [];

        // Try to find the best edition within the search result that has an ISBN
        if (doc.editions && doc.editions.docs && doc.editions.docs.length > 0) {
          for (const edition of doc.editions.docs) {
            const editionIsbns = extractIsbns(edition); // Use updated helper for edition
            if (editionIsbns.length > 0) {
              bestEditionData = edition; // This is the edition we'll use for full details
              combinedIsbns = editionIsbns;
              break; // Found one with ISBNs, take the first relevant one
            }
          }
        }

        // Fallback to work-level ISBNs if no ISBNs found from editions (less common but good fallback)
        if (combinedIsbns.length === 0 && doc.isbn) { // doc.isbn comes from the work-level doc
            combinedIsbns = [...new Set(combinedIsbns.concat(doc.isbn))].filter(Boolean);
        }

        // Construct a unified book object for the frontend, prioritizing edition data
        return {
          key: doc.key, // Original work/edition key (e.g., /works/OL...W)
          title: bestEditionData?.title || doc.title,
          author_name: bestEditionData?.author_name || doc.author_name, // Author name can be top level or in edition
          first_publish_year: bestEditionData?.publish_date?.substring(0,4) || doc.first_publish_year, // Prefer edition publish date (year only)
          cover_i: bestEditionData?.cover_i || doc.cover_i, // Cover ID from edition or work
          isbns: combinedIsbns, // The combined and unique ISBNs found

          // NEW: Edition-level details, prioritized from bestEditionData
          publishers: bestEditionData?.publishers?.map(p => p.name) || [],
          number_of_pages: bestEditionData?.number_of_pages || null,
          physical_format: bestEditionData?.physical_format || null,
          languages: bestEditionData?.languages?.map(l => l.key.split('/').pop()) || [], // Extract language codes
          publish_places: bestEditionData?.publish_places?.map(p => p.name) || [],
          description: bestEditionData?.description?.value || bestEditionData?.description || doc.description?.value || doc.description || null, // Description from edition or work
          subjects: bestEditionData?.subjects?.map(s => s.name) || doc.subjects?.map(s => s.name) || [], // Subjects from edition or work
          // Add other specific fields from editions if needed
        };
      });

      res.json({ docs: processedDocs, numFound: response.data.numFound }); // Send processed docs
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

// REMOVED ROUTE: GET /api/openlibrary/book-details/:olid
// This route is no longer needed as /search will provide details directly.
// You must ensure this route is deleted or commented out if it still exists.

module.exports = router;