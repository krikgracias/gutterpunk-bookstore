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

  // Elements specific to search-results.html
  const searchResultsContainer = document.getElementById('searchResultsContainer'); // ID on search-results.html
  const searchResultsHeading = document.getElementById('searchResultsHeading');
  const searchQueryDisplay = document.getElementById('searchQueryDisplay');

  // Elements specific to book-detail.html (ensure IDs match book-detail.html)
  const bookDetailContainer = document.getElementById('bookDetailContainer');
  const bookDetailTitle = document.getElementById('bookDetailTitle');
  const bookDetailCover = document.getElementById('bookDetailCover');
  const bookDetailAuthor = document.getElementById('bookDetailAuthor');
  const bookDetailPublishYear = document.getElementById('bookDetailPublishYear');
  const bookDetailISBNs = document.getElementById('bookDetailISBNs'); // Div for ISBN lines
  const bookDetailPublisher = document.getElementById('bookDetailPublisher');
  const bookDetailPages = document.getElementById('bookDetailPages');
  const bookDetailFormat = document.getElementById('bookDetailFormat');
  const bookDetailLanguage = document.getElementById('bookDetailLanguage');
  const bookDetailDescription = document.getElementById('bookDetailDescription');
  const bookDetailSubjects = document.getElementById('bookDetailSubjects');
  const addInventoryDetailBtn = document.getElementById('addInventoryDetailBtn'); // Button on detail page


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
  // This function performs the backend search API call and returns the processed data.
  // It does NOT handle displaying results directly anymore, only fetching.
  async function fetchSearchResults(query) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/openlibrary/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch search results from backend:', err);
      throw new Error(`Failed to perform search: ${err.message || 'Network error.'}`);
    }
  }

  // --- Search Results Display Function ---
  // This function takes processed book data and renders it onto the search results page.
  async function displaySearchResults(books) {
    if (!searchResultsContainer) return; // Only run if on search results page

    searchResultsContainer.innerHTML = ''; // Clear loading message

    if (books && books.length > 0) {
      searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2>';
      const fragment = document.createDocumentFragment();

      books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';
        const olid = book.key;

        // --- ISBN Selection and Display for Card ---
        const allFoundIsbns = book.isbns || [];
        const isbn13 = allFoundIsbns.find(isbn => isbn.length === 13) || 'N/A';
        const isbn10 = allFoundIsbns.find(isbn => isbn.length === 10) || 'N/A';
        const genericIsbn = allFoundIsbns.length > 0 ? allFoundIsbns[0] : 'N/A';

        // --- Format other details for card display ---
        const authorDisplay = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
        const publisherDisplay = book.publishers && book.publishers.length > 0 ? book.publishers[0] : 'N/A';
        const pagesDisplay = book.number_of_pages || 'N/A';
        const formatDisplay = book.physical_format || 'N/A';
        const languageDisplay = book.languages && book.languages.length > 0 ? book.languages[0] : 'N/A';

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

      searchResultsContainer.appendChild(fragment);

      // Add event listener for book cover clicks to navigate to detail page
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
      searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
    }
  }


  // --- Search Event Listener (redirects from header search on any page) ---
  if (searchForm) {
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault(); // Prevent page reload
          const query = searchInput.value.trim();
          if (query) {
              window.location.href = `/search-results.html?q=${encodeURIComponent(query)}`;
          } else {
              alert('Please enter a search term.');
          }
      });
  }


  // --- Logic specific to search-results.html (runs ONLY on that page) ---
  if (window.location.pathname === '/search-results.html' && searchResultsContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (searchInput) searchInput.value = query; // Populate search input on results page
      if (searchResultsHeading) searchResultsHeading.textContent = `Search Results for "${query || ''}"`; // Update heading

      if (query) {
          try {
              const data = await fetchSearchResults(query); // Call the fetcher
              await displaySearchResults(data.docs); // Display the docs
          } catch (err) {
              console.error('Error in search results page:', err);
              searchResultsContainer.innerHTML = `<h2>Search Results</h2><p>${err.message || 'Failed to load search results.'}</p>`;
          }
      } else {
          searchResultsContainer.innerHTML = '<h2>Search Results</h2><p>Please enter a search term to find books.</p>';
      }
  }


  // --- Logic specific to book-detail.html (NEW: to display single book details) ---
  if (window.location.pathname === '/book-detail.html' && bookDetailContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const olid = urlParams.get('olid');
      if (!olid) {
          bookDetailContainer.innerHTML = '<p>Error: No Open Library ID provided for book details.</p>';
          return;
      }

      bookDetailContainer.innerHTML = '<p>Loading book details...</p>';
      try {
          // Fetch from YOUR backend proxy's detail endpoint
          // Note: Using /olid-details based on previous backend change
          const res = await fetch(`${API_BASE_URL}/api/openlibrary/olid-details${olid}`);
          if (!res.ok) {
              const errorResponse = await res.json();
              throw new Error(errorResponse.message || `HTTP error! status: ${res.status}`);
          }
          const book = await res.json(); // This 'book' object is the detailed JSON from backend

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


          bookDetailContainer.innerHTML = ''; // Clear loading message
          // Append the dynamically created elements or ensure the HTML structure of book-detail.html is updated for these IDs
          // For now, we're just setting textContent to existing elements.

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
                  addInventoryDetailBtn.style.display = 'none'; // Hide if not admin
              }
          }

          // At this point, the book details are loaded and assigned to HTML elements
          // We can remove the initial loading message from the container
          bookDetailContainer.innerHTML = '';
          // If you want to dynamically build the entire detail card here, you would do it now
          // and append it to bookDetailContainer.
          // For current HTML structure, just setting textContent is fine.

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