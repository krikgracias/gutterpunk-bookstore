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
      const data = await res.json();

      if (data && data.docs && data.docs.length > 0) {
        if (searchResultsContainer) searchResultsContainer.innerHTML = ''; // Clear loading message

        const fragment = document.createDocumentFragment();

        const detailPromises = data.docs.map(async (book) => {
          const card = document.createElement('div');
          card.className = 'book-card';
          const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';
          const olid = book.key;

          // Initial card structure with loading ISBNs
          card.innerHTML = `
            <img src="${coverUrl}" alt="${book.title}">
            <h3>${book.title}</h3>
            <p>${book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
            <p>First Publish Year: ${book.first_publish_year || 'N/A'}</p>
            <p id="isbn-${olid ? olid.replace(/\//g, '-') : 'no-olid-' + Math.random().toString(36).substring(7)}" class="isbn-display">ISBN(s): Loading...</p>
            <button class="add-to-inventory-btn"
                    data-book-key="${olid}"
                    data-book-title="${encodeURIComponent(book.title)}"
                    data-book-author="${encodeURIComponent(book.author_name ? book.author_name.join(', ') : '')}"
                    data-book-publish-year="${book.first_publish_year || ''}"
                    data-book-cover="${coverUrl}"
                    data-book-isbn-initial="${book.isbn && book.isbn.length > 0 ? book.isbn[0] : ''}"
                    >Add to Inventory (Admin)</button>
          `;
          fragment.appendChild(card);

          let isbnDisplay = `ISBN(s): N/A`;
          let fetchedIsbns = [];

          if (olid) {
            try {
              const detailsRes = await fetch(`${API_BASE_URL}/api/openlibrary/book-details${olid}`);
              if (detailsRes.ok) {
                const details = await detailsRes.json();
                fetchedIsbns = details.isbns || [];

                let allIsbns = [...fetchedIsbns];
                if (book.isbn && Array.isArray(book.isbn)) allIsbns = allIsbns.concat(book.isbn);
                const uniqueIsbns = [...new Set(allIsbns)].filter(Boolean);

                if (details._debugLog && details._debugLog.length > 0) {
                   console.log(`Debug log for ${olid}:`, details._debugLog);
                }

                isbnDisplay = uniqueIsbns.length > 0 ? `ISBN(s): ${uniqueIsbns.join(', ')}` : `ISBN(s): N/A`;

                const buttonElement = card.querySelector('.add-to-inventory-btn');
                if (buttonElement && uniqueIsbns.length > 0) {
                    buttonElement.dataset.bookIsbn = uniqueIsbns[0];
                    buttonElement.dataset.bookAllIsbns = uniqueIsbns.join(',');
                }

              } else {
                const errorDetails = await detailsRes.json();
                isbnDisplay = `ISBN(s): Failed to load details.`;
                console.warn(`Failed to fetch details for ${olid}: HTTP status ${detailsRes.status}`, errorDetails);
                if (errorDetails && errorDetails._debugLog && errorDetails._debugLog.length > 0) {
                  console.warn(`Backend debug log for ${olid}:`, errorDetails._debugLog);
                }
              }
            } catch (detailErr) {
              console.error(`Error fetching details for ${olid}:`, detailErr);
              isbnDisplay = `ISBN(s): Error.`;
            }
          } else if (book.isbn && book.isbn.length > 0) {
            isbnDisplay = `ISBN(s): ${book.isbn.join(', ')}`;
            const buttonElement = card.querySelector('.add-to-inventory-btn');
            if (buttonElement) {
                buttonElement.dataset.bookIsbn = book.isbn[0];
                buttonElement.dataset.bookAllIsbns = book.isbn.join(',');
            }
          }

          const currentIsbnElement = card.querySelector(`#isbn-${olid ? olid.replace(/\//g, '-') : 'no-olid-' + card.id}`);
          if (currentIsbnElement) {
              currentIsbnElement.textContent = isbnDisplay;
          }
          return card;
        });

        await Promise.all(detailPromises);
        if (searchResultsContainer) searchResultsContainer.appendChild(fragment);

        document.querySelectorAll('.add-to-inventory-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const token = localStorage.getItem('userToken');
                const isAdminUser = localStorage.getItem('isAdmin') === 'true'; // Get isAdmin status as boolean
                
                if (!token || !isAdminUser) {
                    alert('You must be logged in as an administrator to add books to inventory.');
                    window.location.href = '/login.html'; // Redirect to login page
                    return;
                }

                const bookData = {
                    title: decodeURIComponent(e.target.dataset.bookTitle),
                    author: decodeURIComponent(e.target.dataset.bookAuthor),
                    isbn: e.target.dataset.bookIsbn || e.target.dataset.bookIsbnInitial || null,
                    coverImage: e.target.dataset.bookCover,
                    publicationDate: e.target.dataset.bookPublishYear ? `${e.target.dataset.bookPublishYear}-01-01` : null,
                    price: 0.00,
                    stock: 0,
                    description: "No description available from Open Library search. Please edit in admin panel.",
                    isUsed: false,
                    format: "Paperback",
                    publisher: "Unknown",
                    language: "English"
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

      } else {
        if (searchResultsContainer) searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
      }

    } catch (err) {
      console.error('Failed to perform search:', err);
      if (searchResultsContainer) searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>Failed to perform search. Please try again later.</p>';
    }
  }

  // --- Search Event Listener (now redirects to search-results.html) ---
  if (searchForm) {
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault(); // Prevent page reload
          const query = searchInput.value.trim();
          if (query) {
              // Redirect to search-results.html with the query as a URL parameter
              window.location.href = `/search-results.html?q=${encodeURIComponent(query)}`;
          } else {
              // On index.html, just alert if no query
              alert('Please enter a search term.');
          }
      });
  }


  // --- Logic specific to search-results.html (runs ONLY on that page) ---
  // This block initializes search on the results page based on URL params
  if (window.location.pathname === '/search-results.html' && searchResultsContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (searchInput) searchInput.value = query; // Populate search input on results page
      if (searchResultsHeading) searchResultsHeading.textContent = `Search Results for "${query || ''}"`; // Update heading
      await performSearch(query); // Call performSearch with the query from URL
  }


  // --- Logic specific to index.html (runs ONLY on that page) ---
  // These fetches only happen on the homepage to display featured content
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      await Promise.all([
          fetchData(`${API_BASE_URL}/api/books/featured`, bookContainer, `<p>Failed to load books. Please try again later.</p>`),
          fetchData(`${API_BASE_URL}/api/cafe/coffee-of-week`, coffeeOfWeekElement),
          fetchData(`${API_BASE_URL}/api/cafe/daily-specials`, dailySpecialsList)
      ]).then(results => {
          const [booksData, coffee, specials] = results;

          // Process booksData
          if (booksData) {
              if (booksData.length === 0) {
                  bookContainer.innerHTML = `<p>No featured books available at the moment. Check back soon!</p>`;
              } else {
                  bookContainer.innerHTML = '';
                  booksData.forEach(book => {
                      const card = document.createElement('div');
                      card.className = 'book-card';
                      card.innerHTML = `
                        <img src="${book.coverImage || 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover'}" alt="${book.title}">
                        <h3>${book.title}</h3>
                        <p>${book.author}</p>
                        <p>$${book.price.toFixed(2)}</p>
                        <button class="add-to-cart-btn" data-book-id="${book._id}">Add to Cart</button>
                      `;
                      bookContainer.appendChild(card);
                  });
                  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                      const bookId = e.target.dataset.bookId;
                      console.log(`Adding book ${bookId} to cart! (Mock Action)`);
                      updateCartCount(1);
                      alert('Book added to cart!');
                    });
                  });
              }
          }

          // Process coffee
          if (coffee) {
              if (coffee.name) {
                  coffeeOfWeekElement.textContent = `${coffee.name} - ${coffee.description} ($${coffee.price.toFixed(2)})`;
              } else {
                  coffeeOfWeekElement.textContent = 'No special coffee this week.';
              }
          } else {
              coffeeOfWeekElement.textContent = 'Failed to load coffee special.';
          }

          // Process specials
          if (specials) {
              if (specials.length > 0) {
                  dailySpecialsList.innerHTML = '';
                  specials.forEach(item => {
                      const li = document.createElement('li');
                      li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
                      dailySpecialsList.appendChild(li);
                  });
              } else {
                  dailySpecialsList.innerHTML = '<li>No daily specials today.</li>';
              }
          } else {
              dailySpecialsList.innerHTML = '<li>Failed to load daily specials.</li>';
          }
      });
  }


  // --- Update Cart Count Function (mock for now) ---
  function updateCartCount(change) {
    let currentCount = parseInt(cartCountElement.textContent);
    cartCountElement.textContent = currentCount + change;
  }
  // For a real app, you'd fetch the actual cart count on page load
  // fetch(`${API_BASE_URL}/api/cart`).then(res => res.json()).then(cart => cartCountElement.textContent = cart.items.length || 0);
});