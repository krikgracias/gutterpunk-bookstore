// server/routes/openLibrary.js (The full, correct copy-paste)
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to extract and normalize ISBNs from various Open Library detail objects
function extractIsbns(detailData) {
    let isbns = [];
    const identifiers = detailData.identifiers; // Access the identifiers object

    if (identifiers) {
        if (identifiers.isbn_13) {
            isbns = isbns.concat(identifiers.isbn_13);
        }
        if (identifiers.isbn_10) {
            isbns = isbns.concat(identifiers.isbn_10);
        }
        if (identifiers.lccn) {
            isbns = isbns.concat(identifiers.lccn);
        }
        if (identifiers.oclc) { // Note: docs show 'oclc' for identifiers object
            isbns = isbns.concat(identifiers.oclc);
        }
    } else {
        // Fallback if 'identifiers' object is not present at top level
        if (detailData.isbn_13) {
            isbns = isbns.concat(detailData.isbn_13);
        }
        if (detailData.isbn_10) {
            isbns = isbns.concat(detailData.isbn_10);
        }
        if (detailData.lccn) {
            isbns = isbns.concat(detailData.lccn);
        }
        if (detailData.oclc_id) {
            isbns = isbns.concat(detailData.oclc_id);
        }
    }
    return [...new Set(isbns)].filter(Boolean);
}

// GET /api/openlibrary/search?q=<query> (Initial search route - no change needed here)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) { return res.status(400).json({ message: 'Search query (q) is required.' }); }

  try {
    // We will keep this simple search for the overview, it doesn't need full edition details
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=50`; // Removed &fields=editions
    const response = await axios.get(openLibraryApiUrl, { timeout: 8000 });

    if (response.data && response.data.docs) {
      // Process docs lightly for overview
      const processedDocs = response.data.docs.map(doc => {
        return {
          key: doc.key, // Work/Edition Key
          title: doc.title,
          author_name: doc.author_name,
          first_publish_year: doc.first_publish_year,
          cover_i: doc.cover_i,
          isbns: extractIsbns(doc) // Extract ISBNs if any at top level of search result
        };
      });
      res.json({ docs: processedDocs, numFound: response.data.numFound });
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

// NEW/RESTORED ROUTE: GET /api/openlibrary/book-details/:olid
// This route will now perform the multi-strategy fetch for comprehensive details
router.get('/olid-details/:olid', async (req, res) => {
  const { olid } = req.params;
  if (!olid) {
    return res.status(400).json({ message: 'Open Library ID (olid) is required.' });
  }

  let finalIsbns = [];
  let detailedBookData = null; // This will store the most comprehensive data found
  let debugLog = [];

  try {
    // Strategy 1: Direct fetch by OLID (could be Work or Edition)
    debugLog.push(`Strategy 1: Attempting direct fetch for ${olid}.`);
    try {
      const directDetailsUrl = `https://openlibrary.org${olid}.json`;
      const directResponse = await axios.get(directDetailsUrl, { timeout: 8000 });
      detailedBookData = directResponse.data; // Store initial data
      finalIsbns = extractIsbns(detailedBookData);
      if (finalIsbns.length > 0) {
          debugLog.push(`Strategy 1: Found ISBNs directly.`);
          return res.json({ // Early exit if Work/Edition details are sufficient
              olid: olid,
              title: detailedBookData?.title,
              author: detailedBookData?.author_name || detailedBookData?.authors?.map(a => a.name).join(', ') || 'Unknown Author',
              publish_year: detailedBookData?.first_publish_year || detailedBookData?.publish_date?.substring(0,4),
              cover_i: detailedBookData?.covers?.[0] || detailedBookData?.cover_i,
              description: detailedBookData?.description?.value || detailedBookData?.description,
              isbns: finalIsbns,
              // Add other specific fields from detailedBookData here if you want them on a direct hit
              publishers: detailedBookData?.publishers?.map(p => p.name) || [],
              number_of_pages: detailedBookData?.number_of_pages || null,
              physical_format: detailedBookData?.physical_format || null,
              languages: detailedBookData?.languages?.map(l => l.key.split('/').pop()) || [],
              publish_places: detailedBookData?.publish_places?.map(p => p.name) || [],
              subjects: detailedBookData?.subjects?.map(s => s.name) || [],
              _debugLog: debugLog
          });
      }
    } catch (directError) {
        debugLog.push(`Strategy 1: Direct fetch failed - ${directError.message}.`);
    }

    // Strategy 2: If it's a Work ID and no ISBNs yet (or no primaryDetails), try to find an edition with ISBNs
    if (olid.startsWith('/works/') && finalIsbns.length === 0) {
      debugLog.push(`Strategy 2: Attempting editions fetch for work ${olid}.`);
      try {
        const editionsUrl = `https://openlibrary.org${olid}/editions.json`;
        const editionsResponse = await axios.get(editionsUrl, { timeout: 8000 });

        if (editionsResponse.data && editionsResponse.data.entries && editionsResponse.data.entries.length > 0) {
          let bestEditionKey = null;
          for (const edition of editionsResponse.data.entries) {
            const editionIsbns = extractIsbns(edition);
            if (editionIsbns.length > 0) {
              bestEditionKey = edition.key; // Get the key of the best edition
              finalIsbns = editionIsbns;
              debugLog.push(`Strategy 2: Found ISBNs in edition ${edition.key}.`);
              break;
            }
          }

          // NEW: Make a direct call to this best edition to get its full details
          if (bestEditionKey) {
              debugLog.push(`Strategy 2.1: Fetching full details for best edition ${bestEditionKey}.`);
              try {
                  const fullEditionDetailsUrl = `https://openlibrary.org${bestEditionKey}.json`;
                  const fullEditionResponse = await axios.get(fullEditionDetailsUrl, { timeout: 8000 });
                  if (fullEditionResponse.data) {
                      detailedBookData = fullEditionResponse.data; // OVERWRITE primaryDetails with full edition data
                      debugLog.push(`Strategy 2.1: Successfully fetched full details for edition ${bestEditionKey}.`);
                  }
              } catch (fullEditionError) {
                  debugLog.push(`Strategy 2.1: Failed to fetch full details for edition ${bestEditionKey}: ${fullEditionError.message}.`);
              }
          }
        }
        if (finalIsbns.length === 0) {
            debugLog.push(`Strategy 2: Editions fetch successful, but no ISBNs found in any edition.`);
        }
      } catch (editionsError) {
          debugLog.push(`Strategy 2: Editions fetch failed - ${editionsError.message}.`);
      }
    }


    // Final Response based on all attempts (now `detailedBookData` should be the most comprehensive)
    if (detailedBookData) { // If any detail data was found at all
        // Ensure ISBNs are extracted from the final `detailedBookData`
        finalIsbns = extractIsbns(detailedBookData); // Re-extract in case it was updated by edition fetch

        const responseData = {
            olid: olid, // Original Work/Edition ID
            title: detailedBookData.title,
            author: detailedBookData.author_name || detailedBookData.authors?.map(a => a.name).join(', ') || 'N/A',
            publish_year: detailedBookData.first_publish_year || detailedBookData.publish_date?.substring(0,4) || 'N/A',
            cover_i: detailedBookData.covers?.[0] || detailedBookData.cover_i || null,
            description: detailedBookData.description?.value || detailedBookData.description || 'No description available.',
            isbns: finalIsbns, // The combined and unique ISBNs found

            // NEW: Adding more fields from the detailed book data
            publishers: detailedBookData.publishers?.map(p => p.name) || [],
            number_of_pages: detailedBookData.number_of_pages || null,
            physical_format: detailedBookData.physical_format || null,
            languages: detailedBookData.languages?.map(l => l.key.split('/').pop()) || [],
            publish_places: detailedBookData.publish_places?.map(p => p.name) || [],
            subjects: detailedBookData.subjects?.map(s => s.name) || [],

            _debugLog: debugLog // Include debug log
        };
        console.log(`[OL-DETAIL] Responding with found details and ISBNs for ${olid}.`);
        res.json(responseData);
    } else {
        // If no primaryDetails could be fetched at all
        console.log(`[OL-DETAIL] Responding 404 for ${olid}: No detailed data found after all strategies.`);
        res.status(404).json({
            message: 'No detailed data found for this Open Library ID after all attempts.',
            details: null,
            _debugLog: debugLog
        });
    }

  } catch (error) {
    debugLog.push(`Unhandled error: ${error.message}`);
    console.error(`[OL-DETAIL] Unhandled error in /book-details/:olid for ${olid}:`, error);
    if (error.response) {
      console.error(`[OL-DETAIL] Open Library Response Status: ${error.response.status}, Data:`, error.response.data);
      res.status(error.response.status || 500).json({
          message: 'Error fetching detailed data from Open Library.',
          details: error.response.data || error.message,
          openLibraryUrlAttempted: `https://openlibrary.org${olid}.json`,
          _debugLog: debugLog
      });
    } else {
      res.status(500).json({
          message: 'Server error while fetching Open Library details.',
          details: error.message,
          _debugLog: debugLog
      });
    }
  }
});

module.exports = router;