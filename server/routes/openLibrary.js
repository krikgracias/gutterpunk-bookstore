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
        if (identifiers.oclc) { // Note: docs show 'oclc' for identifiers object
            isbns = isbns.concat(identifiers.oclc);
        }
        // Add goodreads, amazon, etc., from identifiers if you want them in the combined list
        // if (identifiers.goodreads) { isbns = isbns.concat(identifiers.goodreads); }
        // if (identifiers.amazon) { isbns = isbns.concat(identifiers.amazon); }
    }
    // Fallback for cases where 'identifiers' object might not exist, or ISBNs are at root (like in search.json docs)
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

// UPDATED ROUTE: GET /api/openlibrary/search?q=<query>&page=<page_num>&limit=<items_per_page>
// This route now uses the 'fields' parameter to get comprehensive edition details directly
router.get('/search', async (req, res) => {
  const { q } = req.query;
  // Pagination parameters from frontend
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

  if (!q) {
    return res.status(400).json({ message: 'Search query (q) is required.' });
  }

  try {
    // CRITICAL CHANGE: Request ALL necessary edition fields directly in the initial search
    // This is the comprehensive list of fields for the search API
    const fields = 'key,title,author_name,first_publish_year,cover_i,isbn,editions.key,editions.title,editions.isbn,editions.publishers,editions.publish_date,editions.number_of_pages,editions.physical_format,editions.languages,editions.description,editions.lccn,editions.oclc,subjects'; // Ensure all these fields are requested
    const openLibraryApiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=${fields}&limit=${limit}&page=${page}`; // Use limit and page for pagination
    const response = await axios.get(openLibraryApiUrl, { timeout: 10000 });

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

        // Construct a unified book object for the frontend, prioritizing bestEditionData
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
        };
      });

      // NEW: Return total number of found documents for pagination calculation on frontend
      res.json({
          docs: processedDocs,
          numFound: response.data.numFound,
          currentPage: page,
          limit: limit,
          totalPages: Math.ceil(response.data.numFound / limit) // Calculate total pages
      });
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
// This route will now perform the multi-strategy fetch for comprehensive details for a single book.
router.get('/olid-details/:olid', async (req, res) => {
  const { olid } = req.params;
  if (!olid) {
    return res.status(400).json({ message: 'Open Library ID (olid) is required.' });
  }

  let finalIsbns = [];
  let comprehensiveBookData = null; // This will store the most comprehensive data found
  let debugLog = [];

  try {
    // Strategy 1: Direct fetch by OLID (could be a Work or an Edition)
    debugLog.push(`Strategy 1: Attempting direct fetch for ${olid}.`);
    console.log(`[OL-DETAIL] Starting direct fetch for ${olid}`); // Log to Render console
    try {
      const directDetailsUrl = `https://openlibrary.org${olid}.json`;
      const directResponse = await axios.get(directDetailsUrl, { timeout: 10000 }); // Increased timeout
      comprehensiveBookData = directResponse.data; // Store initial data
      finalIsbns = extractIsbns(comprehensiveBookData); // Extract ISBNs from initial fetch

      if (finalIsbns.length > 0 && comprehensiveBookData.type?.key === '/type/edition') { // Check if it's an edition
          // If we found ISBNs directly AND it's an Edition, this is likely our best data. Early exit is fine.
          debugLog.push(`Strategy 1: Found ISBNs directly in an Edition.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, found ISBNs in Edition.`);
      } else if (finalIsbns.length > 0 && comprehensiveBookData.type?.key === '/type/work') {
          // Found ISBNs in a Work directly, which is unusual but possible for some data.
          // We'll proceed to Strategy 2 to try and find an edition for full details anyway.
          debugLog.push(`Strategy 1: Found ISBNs directly in a Work (uncommon, will still check editions).`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, found ISBNs in Work.`);
      } else {
          // No ISBNs found directly or not a recognized type to fully process here, continue to Strategy 2.
          debugLog.push(`Strategy 1: Direct fetch successful for ${olid}, but no ISBNs found directly or not an edition.`);
          console.log(`[OL-DETAIL] Direct fetch successful for ${olid}, but no ISBNs found directly or not an edition.`);
      }
    } catch (directError) {
        debugLog.push(`Strategy 1: Direct fetch failed - ${directError.message}.`);
        console.error(`[OL-DETAIL] Direct OLID fetch failed for ${olid}:`, directError.message);
    }

    // Strategy 2: If it's a Work ID, and we still don't have good comprehensive data (or ISBNs)
    if (olid.startsWith('/works/') && (finalIsbns.length === 0 || !comprehensiveBookData?.publishers)) { // Added check for publishers as a proxy for comprehensive data
      debugLog.push(`Strategy 2: Attempting editions fetch for work ${olid}.`);
      console.log(`[OL-DETAIL] Starting editions fetch for ${olid}`);
      try {
        const editionsUrl = `https://openlibrary.org${olid}/editions.json`;
        const editionsResponse = await axios.get(editionsUrl, { timeout: 10000 });

        if (editionsResponse.data && editionsResponse.data.entries && editionsResponse.data.entries.length > 0) {
          let bestEditionKey = null;
          // Loop through editions to find one with ISBNs, prioritizing more common types if needed
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

          // NEW: Make a direct call to this best edition to get its FULL details (if not already done via direct fetch)
          if (bestEditionKey && (comprehensiveBookData?.key !== bestEditionKey || !comprehensiveBookData?.publishers)) { // Check if we already have this specific edition's data (key, or publishers as a proxy for comprehensive)
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
            title: comprehensiveBookData.title || 'N/A', // Default to N/A if missing
            author: comprehensiveBookData.author_name || comprehensiveBookData.authors?.map(a => a.name).join(', ') || 'N/A', // Author can be name string or array of objects
            publish_year: comprehensiveBookData.first_publish_year || comprehensiveBookData.publish_date?.substring(0,4) || 'N/A',
            cover_i: comprehensiveBookData.covers?.[0] || comprehensiveBookData.cover_i || comprehensiveBookData.id_goodreads?.[0] || null, // Best cover ID (Added id_goodreads as fallback)
            description: comprehensiveBookData.description?.value || comprehensiveBookData.description || 'No description available.', // Description can be object or string
            isbns: finalIsbns, // The combined and unique ISBNs found

            // Comprehensive fields - Ensure consistent defaults or null
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
            details: null, // Send null details
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
