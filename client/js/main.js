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

  // Elements specific to search-results.html (or book-detail.html)
  const searchResultsContainer = document.getElementById('searchResultsContainer'); // ID on search-results.html
  const searchResultsHeading = document.getElementById('searchResultsHeading');
  const searchQueryDisplay = document.getElementById('searchQueryDisplay');
  // For book-detail.html (new elements)
  const bookDetailContainer = document.getElementById('bookDetailContainer');
  const bookDetailTitle = document.getElementById('bookDetailTitle');
  const bookDetailCover = document.getElementById('bookDetailCover');
  const bookDetailAuthor = document.getElementById('bookDetailAuthor');
  const bookDetailPublishYear = document.getElementById('bookDetailPublishYear');
  const bookDetailISBNs = document.getElementById('bookDetailISBNs');
  const bookDetailPublisher = document.getElementById('bookDetailPublisher');
  const bookDetailPages = document.getElementById('bookDetailPages');
  const bookDetailFormat = document.getElementById('bookDetailFormat');
  const bookDetailLanguage = document.getElementById('bookDetailLanguage');
  const bookDetailDescription = document.getElementById('bookDetailDescription');
  const bookDetailSubjects = document.getElementById('bookDetailSubjects');


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

  // --- Main Search Logic Function ---
  // This function is now generalized to run on either page, but its display part only works on search-results.html
  async function performSearch(query) {
    if (!query || query.length === 0) {
      if (searchResultsContainer) { // Only update if on the search results page
        searchResultsContainer.innerHTML = '<h2>Search Results</h2><p>Please enter a search term.</p>';
      }
      return;
    }

    if (searchResultsContainer) { // Only update if on the search results page
      searchResultsContainer.innerHTML = '<h2>Searching Open Library...</h2><p>This might take a moment as we fetch details for each book.</p>';
      if (searchQueryDisplay) searchQueryDisplay.textContent = `For: "${query}"`;
    }

    try {
      // First call: General search to your backend's Open Library proxy endpoint
      // THIS FETCH NOW GETS ALL EDITION DETAILS DIRECTLY FROM BACKEND
      const res = await fetch(`${API_BASE_URL}/api/openlibrary/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        if (searchResultsContainer) {
          if (res.status === 404) {
            searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
          } else {
            searchResultsContainer.innerHTML = `<h2>Search Results</h2><p>Failed to perform search. HTTP status: ${res.status}. Please try again later.</p>`;
          }
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json(); // data.docs will now be the processed docs from backend

      if (data && data.docs && data.docs.length > 0) {
        if (searchResultsContainer) searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2>';

        const fragment = document.createDocumentFragment();

        data.docs.forEach(book => { // 'book' here is the processedDoc from your backend
          const card = document.createElement('div');
          card.className = 'book-card';
          const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';
          const olid = book.key;

          // --- ISBN Selection and Display ---
          const allFoundIsbns = book.isbns || [];
          const isbn13 = allFoundIsbns.find(isbn => isbn.length === 13) || 'N/A';
          const isbn10 = allFoundIsbns.find(isbn => isbn.length === 10) || 'N/A';
          const genericIsbn = allFoundIsbns.length > 0 ? allFoundIsbns[0] : 'N/A'; // Just one generic ISBN


          // --- Format other details ---
          const authorDisplay = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
          const publisherDisplay = book.publishers && book.publishers.length > 0 ? book.publishers[0] : 'N/A';
          const pagesDisplay = book.number_of_pages || 'N/A';


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
            <button class="add-to-inventory-btn"
                    data-book-key="${olid}"
                    data-book-title="${encodeURIComponent(book.title)}"
                    data-book-author="${encodeURIComponent(authorDisplay)}"
                    data-book-publish-year="${book.first_publish_year || ''}"
                    data-book-cover="${coverUrl}"
                    data-book-isbn="${primaryIsbn || ''}"
                    data-book-publisher="${encodeURIComponent(publisherDisplay)}"
                    data-book-pages="${pagesDisplay}"
                    data-book-format="${encodeURIComponent(book.physical_format || '')}"
                    data-book-language="${encodeURIComponent(book.languages && book.languages.length > 0 ? book.languages[0] : '')}"
                    data-book-description="${encodeURIComponent(book.description || '')}"
                    >Add to Inventory (Admin)</button>
          `;
          fragment.appendChild(card);
        });

        if (searchResultsContainer) searchResultsContainer.appendChild(fragment);

        // Add event listeners to "Add to Inventory" buttons (remains mostly same)
        document.querySelectorAll('.add-to-inventory-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const token = localStorage.getItem('userToken');
                const isAdminUser = localStorage.getItem('isAdmin') === 'true';
                
                if (!token || !isAdminUser) {
                    alert('You must be logged in as an administrator to add books to inventory.');
                    window.location.href = '/login.html';
                    return;
                }

                // Retrieve data from button's data-attributes
                const bookData = {
                    title: decodeURIComponent(e.target.dataset.bookTitle),
                    author: decodeURIComponent(e.target.dataset.bookAuthor),
                    isbn: e.target.dataset.bookIsbn || null, // Use the primary ISBN from the data-attribute
                    coverImage: e.target.dataset.bookCover,
                    publicationDate: e.target.dataset.bookPublishYear ? `${e.target.dataset.bookPublishYear}-01-01` : null,
                    price: 0.00, // Placeholder price - ADMIN SHOULD UPDATE
                    stock: 0,    // Placeholder stock - ADMIN SHOULD UPDATE
                    description: decodeURIComponent(e.target.dataset.bookDescription) || "No description available from Open Library search. Please edit in admin panel.",
                    isUsed: false,
                    format: decodeURIComponent(e.target.dataset.bookFormat) || "Paperback", // Default, but try to use fetched format
                    publisher: decodeURIComponent(e.target.dataset.bookPublisher) || "Unknown",
                    language: decodeURIComponent(e.target.dataset.bookLanguage) || "English",
                    number_of_pages: parseInt(e.target.dataset.bookPages) || null // Ensure number
                };

                if (!bookData.title || !bookData.author || !bookData.isbn) {
                    alert('Cannot add book: Missing essential information (Title, Author, or ISBN). Please try a different search or add manually.');
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
                        alert('Book added to inventory successfully! Remember to update details (price, stock, description) via your admin panel.');
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
        });

        // NEW: Add event listener for book cover clicks to navigate to detail page
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
        if (searchResultsContainer) searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
      }

    } catch (err) {
      console.error('Failed to perform search:', err);
      if (searchResultsContainer) searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>Failed to perform search. Please try again later.</p>';
    }
  }

  // --- Search Event Listener (redirects to search-results.html) ---
  if (searchForm) {
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault();
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
      if (searchInput) searchInput.value = query;
      if (searchResultsHeading) searchResultsHeading.textContent = `Search Results for "${query || ''}"`;
      await performSearch(query);
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
          const res = await fetch(`${API_BASE_URL}/api/openlibrary/book-details${olid}`); // Note: Using /book-details
          if (!res.ok) {
              const errorResponse = await res.json();
              throw new Error(errorResponse.message || `HTTP error! status: ${res.status}`);
          }
          const book = await res.json();

          // Populate the book detail page elements
          if (bookDetailTitle) bookDetailTitle.textContent = book.title || 'Unknown Title';
          if (bookDetailCover) bookDetailCover.src = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : 'https://via.placeholder.com/300x450?text=No+Cover';
          if (bookDetailCover) bookDetailCover.alt = book.title || 'Book Cover';
          if (bookDetailAuthor) bookDetailAuthor.textContent = `Author: ${book.author || 'N/A'}`;
          if (bookDetailPublishYear) bookDetailPublishYear.textContent = `Published: ${book.publish_year || 'N/A'}`;

          // ISBNs
          const isbn13 = book.isbns && book.isbns.find(isbn => isbn.length === 13) || 'N/A';
          const isbn10 = book.isbns && book.isbns.find(isbn => isbn.length === 10) || 'N/A';
          const genericIsbn = book.isbns && book.isbns.length > 0 ? book.isbns[0] : 'N/A';
          if (bookDetailISBNs) {
              bookDetailISBNs.innerHTML = `
                <p>ISBN: ${genericIsbn}</p>
                <p>ISBN-13: ${isbn13}</p>
                <p>ISBN-10: ${isbn10}</p>
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
          // You would append the dynamically created elements here or
          // ensure the HTML structure of book-detail.html is updated for these IDs
          // For now, we're just setting textContent to existing elements.

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