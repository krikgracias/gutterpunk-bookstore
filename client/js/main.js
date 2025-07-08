document.addEventListener('DOMContentLoaded', async () => {
  const bookContainer = document.getElementById('book-container');
  const coffeeOfWeekElement = document.getElementById('coffee-of-week');
  const dailySpecialsList = document.getElementById('daily-specials-list');
  const cartCountElement = document.getElementById('cart-count');
  const currentYearElement = document.getElementById('current-year');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const searchResultsContainer = document.getElementById('searchResults');
  const searchForm = document.getElementById('searchForm'); // Ensure this ID is correct in index.html

  // --- BEGIN IMPROVEMENT: API Base URL as a variable ---
  // You can change this single line to switch between environments.
  // For local development, use: 'http://localhost:5000'
  // For Vercel/Render deployed version, use your Render API URL: 'https://gutterpunk-api.onrender.com'
  const API_BASE_URL = 'https://gutterpunk-api.onrender.com'; // <--- CHANGE THIS WHEN NEEDED to your actual Render URL

  // --- END IMPROVEMENT ---

  // Set current year in footer
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  // --- Helper function for fetching books, coffee, specials ---
  // This helps centralize error logging for the main page loads
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

  // --- Fetch Books (Local Inventory) ---
  const booksData = await fetchData(`${API_BASE_URL}/api/books/featured`, bookContainer, `<p>Failed to load books. Please try again later.</p>`);
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
          // In a real app, you'd send this to your backend cart API, e.g.:
          // await fetch(`${API_BASE_URL}/api/cart/add`, {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer YOUR_AUTH_TOKEN` },
          //   body: JSON.stringify({ bookId, quantity: 1 })
          // });
          console.log(`Adding book ${bookId} to cart! (Mock Action)`);
          updateCartCount(1); // Mock cart count update
          alert('Book added to cart!');
        });
      });
    }
  }


  // --- Fetch Coffee of the Week ---
  const coffee = await fetchData(`${API_BASE_URL}/api/cafe/coffee-of-week`, coffeeOfWeekElement);
  if (coffee) {
    if (coffee.name) {
      coffeeOfWeekElement.textContent = `${coffee.name} - ${coffee.description} ($${coffee.price.toFixed(2)})`;
    } else {
      coffeeOfWeekElement.textContent = 'No special coffee this week.';
    }
  } else {
    coffeeOfWeekElement.textContent = 'Failed to load coffee special.';
  }

  // --- Fetch Daily Specials ---
  const specials = await fetchData(`${API_BASE_URL}/api/cafe/daily-specials`, dailySpecialsList);
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


  // --- Search Functionality ---
  // Encapsulate search logic into a function
  async function performSearch() {
    const query = searchInput.value.trim();
    if (query.length === 0) {
      searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>Please enter a search term.</p>';
      return;
    }

    searchResultsContainer.innerHTML = '<h2>Searching Open Library...</h2><p>This might take a moment as we fetch details for each book.</p>'; // Updated loading message

    try {
      // First call: General search to your backend's Open Library proxy endpoint
      const res = await fetch(`${API_BASE_URL}/api/openlibrary/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        if (res.status === 404) {
          searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();

      if (data && data.docs && data.docs.length > 0) {
        searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2>';
        const fragment = document.createDocumentFragment(); // Use a fragment for performance

        // Use Promise.all to fetch details for all books in parallel
        // This is generally faster than sequential 'for...of' if you have many results
        const detailPromises = data.docs.map(async (book) => {
          const card = document.createElement('div');
          card.className = 'book-card';
          const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';
          const olid = book.key; // Open Library ID (e.g., /works/OL12345W or /books/OL12345M)

          // Initial card structure with loading ISBNs
          card.innerHTML = `
            <img src="${coverUrl}" alt="${book.title}">
            <h3>${book.title}</h3>
            <p>${book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
            <p>First Publish Year: ${book.first_publish_year || 'N/A'}</p>
            <p id="isbn-${olid ? olid.replace(/\//g, '-') : 'no-olid-' + Math.random().toString(36).substring(7)}" class="isbn-display">ISBN(s): Loading...</p> <button class="add-to-inventory-btn" data-book-key="${olid}" data-book-title="${encodeURIComponent(book.title)}">Add to Inventory (Admin)</button>
          `;
          fragment.appendChild(card); // Add card to fragment

          let isbnDisplay = `ISBN(s): N/A`;
          if (olid) {
            try {
              // Fetch from YOUR backend proxy's new detail endpoint
              const detailsRes = await fetch(`${API_BASE_URL}/api/openlibrary/details${olid}`);
              if (detailsRes.ok) {
                const details = await detailsRes.json();
                let allIsbns = [];
                if (details.isbn_13) allIsbns = allIsbns.concat(details.isbn_13);
                if (details.isbn_10) allIsbns = allIsbns.concat(details.isbn_10);
                // Also pull ISBNs from the initial search result if available
                if (book.isbn && Array.isArray(book.isbn)) allIsbns = allIsbns.concat(book.isbn);

                // Filter out duplicates and invalid entries (null, undefined, empty strings)
                const uniqueIsbns = [...new Set(allIsbns)].filter(Boolean);

                isbnDisplay = uniqueIsbns.length > 0 ? `ISBN(s): ${uniqueIsbns.join(', ')}` : `ISBN(s): N/A`;

              } else {
                isbnDisplay = `ISBN(s): Failed to load details.`;
                console.warn(`Failed to fetch details for ${olid}: HTTP status ${detailsRes.status}`);
              }
            } catch (detailErr) {
              console.error(`Error fetching details for ${olid}:`, detailErr);
              isbnDisplay = `ISBN(s): Error.`;
            }
          } else if (book.isbn && book.isbn.length > 0) { // Fallback: Use initial search ISBN if no OLID
            isbnDisplay = `ISBN(s): ${book.isbn.join(', ')}`;
          }

          // Update the ISBN field on the card after the detail fetch
          const currentIsbnElement = card.querySelector(`#isbn-${olid ? olid.replace(/\//g, '-') : 'no-olid-' + card.id}`); // Re-find using the ID
          if (currentIsbnElement) {
              currentIsbnElement.textContent = isbnDisplay;
          }
          return card; // Return the card for Promise.all
        });

        // Wait for all detail fetches to complete (or fail)
        await Promise.all(detailPromises);
        searchResultsContainer.appendChild(fragment); // Append all cards to the DOM
      } else {
        searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
      }

    } catch (err) {
      console.error('Failed to perform search:', err);
      searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>Failed to perform search. Please try again later.</p>';
    }
  }

  // --- Search Event Listener (using form submit) ---
  if (searchForm) {
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault(); // Prevent page reload
          await performSearch(); // Call the encapsulated search function
      });
  } else {
      // Fallback if form not found (shouldn't happen if HTML is correct)
      searchButton.addEventListener('click', performSearch);
  }


  // --- Update Cart Count Function (mock for now) ---
  function updateCartCount(change) {
    let currentCount = parseInt(cartCountElement.textContent);
    cartCountElement.textContent = currentCount + change;
  }
  // For a real app, you'd fetch the actual cart count on page load
  // fetch(`${API_BASE_URL}/api/cart`).then(res => res.json()).then(cart => cartCountElement.textContent = cart.items.length || 0);
});