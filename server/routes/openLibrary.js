// server/routes/openLibrary.js (Full Copy-Paste)
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to extract and normalize ISBNs from various Open Library detail objects
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
        if (identifiers.oclc) { // Note: docs show 'oclc' for identifiers object
            isbns = isbns.concat(identifiers.oclc);
        }
    }
    // Fallback for cases where 'identifiers' object might not exist, or ISBNs are at root (like in search.json docs)
    if (detailData.isbn_13 && !identifiers) {
        isbns = isbns.concat(detailData.isbn_13);
    }
    if (detailData.isbn_10 && !identifiers) {
        isbns = isbns.concat(detailData.isbn_10);
    }
    if (detailData.lccn && !identifiers) {
        isbns = isbns.concat(detailData.lccn);
    }
    if (detailData.oclc_id && !identifiers) {
        isbns = isbns.concat(detailData.oclc_id);
    }

    return [...new Set(isbns)].filter(Boolean); // Get unique, non-empty ISBNs
}

// GET /api/openlibrary/search?q=<query> (SIMPLIFIED BACK TO BASIC SEARCH RESULTS)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query (q) is required.' });
  }

  try {
    // SIMPLIFIED: Request only basic fields. We'll get full details on the detail page.
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=50&fields=key,title,author_name,first_publish_year,cover_i,isbn`; // Removed editions fields
    const response = await axios.get(openLibraryApiUrl, { timeout: 8000 });

    if (response.data && response.data.docs) {
      // Process docs lightly for overview display
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

// RESTORED & ENHANCED ROUTE: GET /api/openlibrary/olid-details/:olid
// This route will now perform the multi-strategy fetch for comprehensive details
router.get('/olid-details/:olid', async (req, res) => {
  const { olid } = req.params;
  if (!olid) {
    return res.status(400).json({ message: 'Open Library ID (olid) is required.' });
  }

  let finalIsbns = [];
  let comprehensiveBookData = null; // This will store the most comprehensive data found
  let debugLog = [];

  try {
    // Strategy 1: Direct fetch by OLID (could be Work or Edition)
    debugLog.push(`Strategy 1: Attempting direct fetch for ${olid}.`);
    console.log(`[OL-DETAIL] Starting direct fetch for ${olid}`);
    try {
      const directDetailsUrl = `https://openlibrary.org${olid}.json`;
      const directResponse = await axios.get(directDetailsUrl, { timeout: 10000 }); // Increased timeout
      comprehensiveBookData = directResponse.data; // Store initial data
      finalIsbns = extractIsbns(comprehensiveBookData); // Extract ISBNs from initial fetch

      if (finalIsbns.length > 0 && comprehensiveBookData.type.key === '/type/edition') {
          // If we found ISBNs directly AND it's an Edition, this is likely our best data
          debugLog.push(`Strategy 1: Found ISBNs directly in an Edition.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, found ISBNs in Edition.`);
          // We'll proceed to final response construction
      } else if (finalIsbns.length > 0 && comprehensiveBookData.type.key === '/type/work') {
          // Found ISBNs in a Work directly, which is unusual but possible for some data.
          debugLog.push(`Strategy 1: Found ISBNs directly in a Work (uncommon).`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, found ISBNs in Work.`);
      } else {
          debugLog.push(`Strategy 1: Direct fetch successful for ${olid}, but no ISBNs found directly or not an edition.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, but no ISBNs found directly or not an edition.`);
      }
    } catch (directError) {
        debugLog.push(`Strategy 1: Direct fetch failed - ${directError.message}.`);
        console.error(`[OL-DETAIL] Direct OLID fetch failed for ${olid}:`, directError.message);
    }

    // Strategy 2: If it's a Work ID and we still don't have ISBNs, try to find an edition with ISBNs
    if (olid.startsWith('/works/') && finalIsbns.length === 0) {
      debugLog.push(`Strategy 2: Attempting editions fetch for work ${olid}.`);
      console.log(`[OL-DETAIL] Starting editions fetch for ${olid}`);
      try {
        const editionsUrl = `https://openlibrary.org${olid}/editions.json`;
        const editionsResponse = await axios.get(editionsUrl, { timeout: 10000 });

        if (editionsResponse.data && editionsResponse.data.entries && editionsResponse.data.entries.length > 0) {
          let bestEditionKey = null;
          for (const edition of editionsResponse.data.entries) {
            const editionIsbns = extractIsbns(edition);
            if (editionIsbns.length > 0) {
              bestEditionKey = edition.key; // Get the key of the best edition
              finalIsbns = editionIsbns; // Update finalIsbns from edition
              debugLog.push(`Strategy 2: Found ISBNs in edition ${edition.key}.`);
              console.log(`[OL-DETAIL] Editions fetch successful for ${olid}, found ISBNs in edition ${edition.key}.`);
              break; // Found one with ISBNs, stop searching
            }
          }

          // NEW: Make a direct call to this best edition to get its full details (if not already done via direct fetch)
          if (bestEditionKey && (comprehensiveBookData?.key !== bestEditionKey || !comprehensiveBookData?.publishers)) { // Check if we already have this specific edition's data
              debugLog.push(`Strategy 2.1: Fetching full details for best edition ${bestEditionKey}.`);
              console.log(`[OL-DETAIL] Fetching full edition details for ${bestEditionKey}`);
              try {
                  const fullEditionDetailsUrl = `https://openlibrary.org${bestEditionKey}.json`;
                  const fullEditionResponse = await axios.get(fullEditionDetailsUrl, { timeout: 10000 });
                  if (fullEditionResponse.data) {
                      comprehensiveBookData = fullEditionResponse.data; // OVERWRITE with full edition data
                      debugLog.push(`Strategy 2.1: Successfully fetched full details for edition ${bestEditionKey}.`);
                  }
              } catch (fullEditionError) {
                  debugLog.push(`Strategy 2.1: Failed to fetch full details for edition ${bestEditionKey}: ${fullEditionError.message}.`);
                  console.error(`[OL-DETAIL] Failed to fetch full edition details for ${bestEditionKey}:`, fullEditionError.message);
              }
          }
        }
        if (finalIsbns.length === 0) {
            debugLog.push(`Strategy 2: Editions fetch successful, but no ISBNs found in any edition.`);
            console.log(`[OL-DETAIL] Editions fetch successful for ${olid}, but no ISBNs found in any edition.`);
        }
      } catch (editionsError) {
          debugLog.push(`Strategy 2: Editions fetch failed - ${editionsError.message}.`);
          console.error(`[OL-DETAIL] Editions fetch failed for ${olid}:`, editionsError.message);
      }
    }

    // Final Response based on all attempts (comprehensiveBookData should now be the most complete)
    if (comprehensiveBookData) { // If any detail data was found at all
        // Re-extract ISBNs from the final `comprehensiveBookData` in case it was updated by edition fetch
        finalIsbns = extractIsbns(comprehensiveBookData);

        // Use the data structure from the more comprehensive API response (jscmd=data style)
        const responseData = {
            olid: olid, // Original Work/Edition ID
            title: comprehensiveBookData.title,
            author: comprehensiveBookData.author_name || comprehensiveBookData.authors?.map(a => a.name).join(', ') || 'N/A', // Author can be name string or array of objects
            publish_year: comprehensiveBookData.first_publish_year || comprehensiveBookData.publish_date?.substring(0,4) || 'N/A',
            // Covers can be complex. Prefer 'covers' array or 'cover_i' from docs, or id_goodreads
            cover_i: comprehensiveBookData.covers?.[0] || comprehensiveBookData.cover_i || comprehensiveBookData.id_goodreads?.[0] || null, // Best cover ID
            description: comprehensiveBookData.description?.value || comprehensiveBookData.description || 'No description available.', // Description can be object or string
            isbns: finalIsbns, // The combined and unique ISBNs found

            // Comprehensive fields
            publishers: comprehensiveBookData.publishers?.map(p => p.name) || [],
            number_of_pages: comprehensiveBookData.number_of_pages || null,
            physical_format: comprehensiveBookData.physical_format || comprehensiveBookData.medium || null, // Check for 'medium' too
            languages: comprehensiveBookData.languages?.map(l => l.key.split('/').pop()) || [], // Extract language codes
            publish_places: comprehensiveBookData.publish_places?.map(p => p.name) || [],
            subjects: comprehensiveBookData.subjects?.map(s => s.name) || [],

            _debugLog: debugLog // Include debug log
        };
        console.log(`[OL-DETAIL] Responding with found details and ISBNs for ${olid}.`);
        res.json(responseData);
    } else {
        // If no comprehensiveBookData could be fetched at all
        console.log(`[OL-DETAIL] Responding 404 for ${olid}: No detailed data found after all strategies.`);
        res.status(404).json({
            message: 'No detailed data found for this Open Library ID after all attempts.',
            details: null,
            _debugLog: debugLog
        });
    }

  } catch (error) {
    debugLog.push(`Unhandled error: ${error.message}`);
    console.error(`[OL-DETAIL] Unhandled error in /olid-details/:olid for ${olid}:`, error);
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