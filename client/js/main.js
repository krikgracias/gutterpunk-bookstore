document.addEventListener('DOMContentLoaded', async () => {
  // Elements that exist on both index.html and search-results.html (header/footer elements)
  const currentYearElement = document.getElementById('current-year');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton'); // The button in the header
  const searchForm = document.getElementById('searchForm'); // The form in the header
  const cartCountElement = document.getElementById('cart-count'); // Cart count in header

  // Elements specific to index.html
  const bookContainer = document.getElementById('book-container');
  const coffeeOfWeekElement = document.getElementById('coffee-of-week');
  const dailySpecialsList = document.getElementById('daily-specials-list');

  // Elements specific to search-results.html (Declared with 'let' to assign conditionally)
  let searchResultsContainer;
  let searchResultsHeading;
  let searchQueryDisplay;
  let prevPageBtn;
  let nextPageBtn;
  let pageInfoSpan;

  // Elements specific to book-detail.html (Declared with 'let' to assign conditionally)
  let bookDetailContainer;
  let bookDetailTitle;
  let bookDetailCover;
  let bookDetailAuthor;
  let bookDetailPublishYear;
  let bookDetailISBNs;
  let bookDetailPublisher;
  let bookDetailPages;
  let bookDetailFormat;
  let bookDetailLanguage;
  let bookDetailDescription;
  let bookDetailSubjects;
  let addInventoryDetailBtn;


  // --- Global State for Pagination ---
  let currentPage = 1;
  const itemsPerPage = 10; // Fixed number of results per page for frontend logic
  let currentSearchQuery = ''; // Store the current search query

  // --- API Base URL ---
  const API_BASE_URL = 'https://gutterpunk-api.onrender.com'; // Your Render API URL

  // Set current year in footer (runs on all pages including login/register)
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  // --- Helper function for fetching common data (books, coffee, specials) ---
  async function fetchData(url, errorMsgElement, defaultContent) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`Failed to load data from ${url}:`, err);
      if (errorMsgElement) {
        errorMsgElement.innerHTML = defaultContent || `<p>Failed to load data. Please try again later.</p>`;
      }
      return null;
    }
  }

  // --- Core Search Logic Function ---
  async function fetchSearchResults(query, page = 1, limit = itemsPerPage) {
    console.log(`[MAIN.JS] Calling fetchSearchResults for query: "${query}", page: ${page}, limit: ${limit}`); // LOG
    try {
      const res = await fetch(`${API_BASE_URL}/api/openlibrary/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      if (!res.ok) {
        console.error(`[MAIN.JS] fetchSearchResults HTTP error: ${res.status}`); // LOG
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`[MAIN.JS] fetchSearchResults received data:`, data); // LOG
      return data; // This returns docs, numFound, currentPage, totalPages
    } catch (err) {
      console.error('[MAIN.JS] Failed to fetch search results from backend:', err); // LOG
      throw new Error(`Failed to perform search: ${err.message || 'Network error.'}`);
    }
  }

  // --- Search Results Display Function ---
  async function displaySearchResults(searchData) { // Expects full searchData object (with docs, numFound, etc.)
    console.log(`[MAIN.JS] displaySearchResults called with:`, searchData); // LOG
    const books = searchData.docs;
    const numFound = searchData.numFound;
    const totalPages = searchData.totalPages;
    currentPage = searchData.currentPage; // Update global currentPage from backend response

    // Get searchResultsContainer specific to this function's need
    const localSearchResultsContainer = document.getElementById('searchResultsContainer');

    if (!localSearchResultsContainer) return; // Only run if on search results page

    localSearchResultsContainer.innerHTML = ''; // Clear loading message

    if (books && books.length > 0) {
      localSearchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2>';
      const fragment = document.createDocumentFragment();

      books.forEach(book => { // 'book' here is the processedDoc from your backend's /search
        const card = document.createElement('div');
        card.className = 'book-card';
        const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';
        const olid = book.key;

        // --- ISBN Selection and Display ---
        const allFoundIsbns = book.isbns || [];
        const isbn13 = allFoundIsbns.find(isbn => isbn.length === 13) || 'N/A';
        const isbn10 = allFoundIsbns.find(isbn => isbn.length === 10) || 'N/A';
        const genericIsbn = allFoundIsbns.length > 0 ? allFoundIsbns[0] : 'N/A';


        // --- Format other details for card display ---
        const authorDisplay = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
        const publisherDisplay = book.publishers && book.publishers.length > 0 ? book.publishers[0] : 'N/A';
        const pagesDisplay = book.number_of_pages || 'N/A';
        const formatDisplay = book.physical_format || 'N/A';
        const languageDisplay = book.languages && book.languages.length > 0 ? book.languages[0] : 'N/A'; // Show first language if multiple

        card.innerHTML = `
          <img src="${coverUrl}" alt="${book.title}" class="book-cover-clickable" data-olid="${olid}" />
          <h3>${book.title}</h3>
          <p>${authorDisplay}</p>
          <p>Published: ${book.first_publish_year || 'N/A'}</p>
          <p class="isbn-general">ISBN: ${genericIsbn}</p>
          <p class="isbn13">ISBN-13: ${isbn13}</p>
          <p class="isbn10">ISBN-10: ${isbn10}</p>
          <p class="publisher">Publisher: ${publisherDisplay}</p>
          <p class="pages">Pages: ${pagesDisplay}</p>
          <p class="format">Format: ${formatDisplay}</p>
          <p class="language">Language: ${languageDisplay}</p>
        `;
        fragment.appendChild(card);
      });

      localSearchResultsContainer.appendChild(fragment);

      document.querySelectorAll('.book-cover-clickable').forEach(img => {
          img.addEventListener('click', (e) => {
              const olid = e.target.dataset.olid;
              if (olid) {
                  window.location.href = `/book-detail.html?olid=${encodeURIComponent(olid)}`;
              } else {
                  alert('Could not open book details: Missing Open Library ID.');
              }
          });
      });

    } else {
      localSearchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
    }

    // Update pagination controls visibility and text
    // Assign these elements conditionally here or pass them as parameters if they're not global
    const localPageInfoSpan = document.getElementById('pageInfo');
    const localPrevPageBtn = document.getElementById('prevPageBtn');
    const localNextPageBtn = document.getElementById('nextPageBtn');

    if (localPageInfoSpan && localPrevPageBtn && localNextPageBtn) {
        localPageInfoSpan.textContent = `Page ${currentPage} of ${totalPages} (Total: ${numFound})`;
        localPrevPageBtn.disabled = currentPage <= 1;
        localNextPageBtn.disabled = currentPage >= totalPages;
    }
  }


  // --- Search Event Listener (redirects from header search on any page) ---
  if (searchForm) {
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault(); // Prevent page reload
          const query = searchInput.value.trim();
          if (query) {
              console.log(`[MAIN.JS] Search form submitted: "${query}"`); // LOG
              window.location.href = `/search-results.html?q=${encodeURIComponent(query)}&page=1`; // Start on page 1
          } else {
              alert('Please enter a search term.');
          }
      });
  }

  // --- Pagination Event Listeners (Attached conditionally) ---
  // Assign these elements conditionally here or pass them as parameters if they're not global
  if (window.location.pathname === '/search-results.html') {
      prevPageBtn = document.getElementById('prevPageBtn');
      nextPageBtn = document.getElementById('nextPageBtn');
      pageInfoSpan = document.getElementById('pageInfo'); // Re-assign within this scope for listeners

      if (prevPageBtn && nextPageBtn) { // Check if buttons exist
          prevPageBtn.addEventListener('click', () => {
              console.log(`[MAIN.JS] Previous page button clicked. Current page: ${currentPage}`); // LOG
              if (currentPage > 1 && currentSearchQuery) {
                  window.location.href = `/search-results.html?q=${encodeURIComponent(currentSearchQuery)}&page=${currentPage - 1}`;
              }
          });

          nextPageBtn.addEventListener('click', () => {
              console.log(`[MAIN.JS] Next page button clicked. Current page: ${currentPage}`); // LOG
              if (!nextPageBtn.disabled && currentSearchQuery) {
                  window.location.href = `/search-results.html?q=${encodeURIComponent(currentSearchQuery)}&page=${currentPage + 1}`;
              }
          });
      }
  }


  // --- Logic specific to search-results.html (runs ONLY on that page) ---
  if (window.location.pathname === '/search-results.html') {
      const urlParams = new URLSearchParams(window.location.search);
      currentSearchQuery = urlParams.get('q');
      currentPage = parseInt(urlParams.get('page')) || 1;

      // Assign search-results-specific elements
      searchResultsContainer = document.getElementById('searchResultsContainer');
      searchResultsHeading = document.getElementById('searchResultsHeading');
      searchQueryDisplay = document.getElementById('searchQueryDisplay');


      if (searchInput) searchInput.value = currentSearchQuery || '';
      if (searchResultsHeading) searchResultsHeading.textContent = `Search Results for "${currentSearchQuery || ''}"`;

      if (currentSearchQuery) {
          console.log(`[MAIN.JS] Initializing search for results page: "${currentSearchQuery}", page ${currentPage}`); // LOG
          searchResultsContainer.innerHTML = '<h2>Searching Open Library...</h2><p>Loading current page...</p>';
          // Make sure pagination buttons are temporarily disabled while loading
          if (prevPageBtn) prevPageBtn.disabled = true;
          if (nextPageBtn) nextPageBtn.disabled = true;
          if (pageInfoSpan) pageInfoSpan.textContent = 'Loading...';

          try {
              const data = await fetchSearchResults(currentSearchQuery, currentPage, itemsPerPage);
              await displaySearchResults(data);
              console.log(`[MAIN.JS] Search results displayed successfully.`); // LOG
          } catch (err) {
              console.error('[MAIN.JS] Error in search results page catch block:', err); // LOG
              searchResultsContainer.innerHTML = `<h2>Search Results</h2><p>${err.message || 'Failed to load search results.'}</p>`;
              if (pageInfoSpan) pageInfoSpan.textContent = 'Error loading results.';
              if (prevPageBtn) prevPageBtn.disabled = true;
              if (nextPageBtn) nextPageBtn.disabled = true;
          }
      } else {
          console.log(`[MAIN.JS] No query found on search results page URL.`); // LOG
          searchResultsContainer.innerHTML = '<h2>Search Results</h2><p>Please enter a search term to find books.</p>';
          if (pageInfoSpan) pageInfoSpan.textContent = '';
          if (prevPageBtn) prevPageBtn.disabled = true;
          if (nextPageBtn) nextPageBtn.disabled = true;
      }
  }


  // --- Logic specific to book-detail.html (to display single book details) ---
  if (window.location.pathname === '/book-detail.html') {
      // Assign book-detail-specific elements
      bookDetailContainer = document.getElementById('bookDetailContainer');
      bookDetailTitle = document.getElementById('bookDetailTitle');
      bookDetailCover = document.getElementById('bookDetailCover');
      bookDetailAuthor = document.getElementById('bookDetailAuthor');
      bookDetailPublishYear = document.getElementById('bookDetailPublishYear');
      bookDetailISBNs = document.getElementById('bookDetailISBNs');
      bookDetailPublisher = document.getElementById('bookDetailPublisher');
      bookDetailPages = document.getElementById('bookDetailPages');
      bookDetailFormat = document.getElementById('bookDetailFormat');
      bookDetailLanguage = document.getElementById('bookDetailLanguage');
      bookDetailDescription = document.getElementById('bookDetailDescription');
      bookDetailSubjects = document.getElementById('bookDetailSubjects');
      addInventoryDetailBtn = document.getElementById('addInventoryDetailBtn');


      const urlParams = new URLSearchParams(window.location.search);
      const olid = urlParams.get('olid');
      if (!olid) {
          if (bookDetailContainer) bookDetailContainer.innerHTML = '<p>Error: No Open Library ID provided for book details.</p>';
          return;
      }

      if (bookDetailContainer) bookDetailContainer.innerHTML = '<p>Loading book details...</p>';
      try {
          console.log(`[MAIN.JS] Fetching book details for OLID: ${olid}`); // LOG
          const res = await fetch(`${API_BASE_URL}/api/openlibrary/olid-details${olid}`);
          if (!res.ok) {
              const errorResponse = await res.json();
              console.error(`[MAIN.JS] Book detail fetch HTTP error: ${res.status}`, errorResponse); // LOG
              throw new Error(errorResponse.message || `HTTP error! status: ${res.status}`);
          }
          const book = await res.json();
          console.log(`[MAIN.JS] Book detail data received:`, book); // LOG

          // Populate the book detail page elements
          if (bookDetailTitle) bookDetailTitle.textContent = book.title || 'Unknown Title';
          if (bookDetailCover) bookDetailCover.src = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : 'https://via.placeholder.com/300x450?text=No+Cover';
          if (bookDetailCover) bookDetailCover.alt = book.title || 'Book Cover';
          if (bookDetailAuthor) bookDetailAuthor.textContent = `Author: ${book.author || 'N/A'}`;
          if (bookDetailPublishYear) bookDetailPublishYear.textContent = `Published: ${book.publish_year || 'N/A'}`;

          // ISBNs - specific lines for ISBN, ISBN-13, ISBN-10
          const isbn13 = book.isbns && book.isbns.find(isbn => isbn.length === 13) || 'N/A';
          const isbn10 = book.isbns && book.isbns.find(isbn => isbn.length === 10) || 'N/A';
          const genericIsbn = book.isbns && book.isbns.length > 0 ? book.isbns[0] : 'N/A';
          if (bookDetailISBNs) { // This div will contain multiple <p> tags
              bookDetailISBNs.innerHTML = `
                <p><strong>ISBN:</strong> ${genericIsbn}</p>
                <p><strong>ISBN-13:</strong> ${isbn13}</p>
                <p><strong>ISBN-10:</strong> ${isbn10}</p>
              `;
          }
          
          // Other details
          if (bookDetailPublisher) bookDetailPublisher.textContent = `Publisher: ${book.publishers && book.publishers.length > 0 ? book.publishers[0] : 'N/A'}`;
          if (bookDetailPages) bookDetailPages.textContent = `Pages: ${book.number_of_pages || 'N/A'}`;
          if (bookDetailFormat) bookDetailFormat.textContent = `Format: ${book.physical_format || 'N/A'}`;
          if (bookDetailLanguage) bookDetailLanguage.textContent = `Language: ${book.languages && book.languages.length > 0 ? book.languages.join(', ') : 'N/A'}`;
          if (bookDetailDescription) bookDetailDescription.innerHTML = `<strong>Description:</strong> ${book.description || 'No description available.'}`;
          if (bookDetailSubjects) bookDetailSubjects.innerHTML = `<strong>Subjects:</strong> ${book.subjects && book.subjects.length > 0 ? book.subjects.join(', ') : 'N/A'}`;


          if (bookDetailContainer) bookDetailContainer.innerHTML = ''; // Clear loading message from container

          // Show/Hide Add to Inventory button on detail page based on admin status
          const token = localStorage.getItem('userToken');
          const isAdminUser = localStorage.getItem('isAdmin') === 'true';

          if (addInventoryDetailBtn) {
              if (token && isAdminUser) {
                  addInventoryDetailBtn.style.display = 'block'; // Show if admin
                  // Set data attributes for the detail page's add button
                  addInventoryDetailBtn.dataset.bookKey = olid;
                  addInventoryDetailBtn.dataset.bookTitle = encodeURIComponent(book.title || '');
                  addInventoryDetailBtn.dataset.bookAuthor = encodeURIComponent(book.author || '');
                  addInventoryDetailBtn.dataset.bookPublishYear = book.publish_year || '';
                  addInventoryDetailBtn.dataset.bookCover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : 'https://via.placeholder.com/300x450?text=No+Cover';
                  addInventoryDetailBtn.dataset.bookIsbn = genericIsbn !== 'N/A' ? genericIsbn : '';
                  addInventoryDetailBtn.dataset.bookPublisher = encodeURIComponent(book.publishers && book.publishers.length > 0 ? book.publishers[0] : '');
                  addInventoryDetailBtn.dataset.bookPages = book.number_of_pages || '';
                  addInventoryDetailBtn.dataset.bookFormat = encodeURIComponent(book.physical_format || '');
                  addInventoryDetailBtn.dataset.bookLanguage = encodeURIComponent(book.languages && book.languages.length > 0 ? book.languages[0] : '');
                  addInventoryDetailBtn.dataset.bookDescription = encodeURIComponent(book.description || '');

                  // Add event listener to this specific button
                  addInventoryDetailBtn.addEventListener('click', async (e) => {
                      const bookData = {
                          title: decodeURIComponent(e.target.dataset.bookTitle),
                          author: decodeURIComponent(e.target.dataset.bookAuthor),
                          isbn: e.target.dataset.bookIsbn || null,
                          coverImage: e.target.dataset.bookCover,
                          publicationDate: e.target.dataset.bookPublishYear ? `${e.target.dataset.bookPublishYear}-01-01` : null,
                          price: 0.00, // Placeholder
                          stock: 0,    // Placeholder
                          description: decodeURIComponent(e.target.dataset.bookDescription) || "No description available from Open Library. Please edit in admin panel.",
                          isUsed: false,
                          format: decodeURIComponent(e.target.dataset.bookFormat) || "Paperback",
                          publisher: decodeURIComponent(e.target.dataset.bookPublisher) || "Unknown",
                          language: decodeURIComponent(e.target.dataset.bookLanguage) || "English",
                          number_of_pages: parseInt(e.target.dataset.bookPages) || null
                      };

                      if (!bookData.title || !bookData.author || !bookData.isbn) {
                          alert('Cannot add book: Missing essential information (Title, Author, or ISBN).');
                          return;
                      }

                      try {
                          const res = await fetch(`${API_BASE_URL}/api/books`, {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify(bookData)
                          });

                          if (res.ok) {
                              alert('Book added to inventory successfully! Remember to update details via admin panel.');
                              e.target.textContent = 'Added!';
                              e.target.disabled = true;
                          } else {
                              const errorResponse = await res.json();
                              alert(`Failed to add book: ${errorResponse.message || 'Server error.'}`);
                              console.error('Add to inventory error:', errorResponse);
                          }
                      } catch (err) {
                          console.error('Network error when adding book:', err);
                          alert('Network error: Could not add book to inventory. Please check your connection.');
                      }
                  });

              } else {
                  addInventoryDetailBtn.style.display = 'none';
              }
          }

          // At this point, the book details are loaded and assigned to HTML elements
          // We can remove the initial loading message from the container
          // bookDetailContainer.innerHTML = ''; // Already called, can be removed if specific element updates are enough

      } catch (err) {
          console.error('Error fetching book details:', err);
          if (bookDetailContainer) bookDetailContainer.innerHTML = `<p>Failed to load book details: ${err.message || 'Server error.'}</p>`;
      }
  }


  // --- Update Cart Count Function (mock for now) ---
  function updateCartCount(change) {
    let currentCount = parseInt(cartCountElement.textContent);
    cartCountElement.textContent = currentCount + change;
  }
  // For a real app, you'd fetch the actual cart count on page load
  // fetch(`${API_BASE_URL}/api/cart`).then(res => res.json()).then(cart => cartCountElement.textContent = cart.items.length || 0);
});
