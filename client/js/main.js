document.addEventListener('DOMContentLoaded', async () => {
  const bookContainer = document.getElementById('book-container');
  const coffeeOfWeekElement = document.getElementById('coffee-of-week');
  const dailySpecialsList = document.getElementById('daily-specials-list');
  const cartCountElement = document.getElementById('cart-count');
  const currentYearElement = document.getElementById('current-year');

  // --- BEGIN IMPROVEMENT: API Base URL as a variable ---
  // You can change this single line to switch between environments.
  // For local development, use: 'http://localhost:5000'
  // For Vercel/Render deployed version, use your Render API URL: 'https://YOUR_RENDER_API_URL.onrender.com'
  const API_BASE_URL = 'https://gutterpunk-api.onrender.com'; // <--- CHANGE THIS WHEN NEEDED

  // --- END IMPROVEMENT ---
  // Set current year in footer
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  // --- Fetch Books ---
  try {
    // Note: The frontend is now looking for a /api/books/featured endpoint
    // Make sure your server is running and configured correctly, e.g., on http://localhost:5000
    const res = await fetch(`${API_BASE_URL}/api/books/featured`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const books = await res.json();

    if (books.length === 0) {
      bookContainer.innerHTML = `<p>No featured books available at the moment. Check back soon!</p>`;
    } else {
      bookContainer.innerHTML = '';
      books.forEach(book => {
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
          // await fetch('http://localhost:5000/api/cart/add', {
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
  } catch (err) {
    console.error('Failed to load books:', err);
    bookContainer.innerHTML = `<p>Failed to load books. Please try again later.</p>`;
  }

  // --- Fetch Coffee of the Week ---
  try {
    // Note: This endpoint needs to be created on your server
    const res = await fetch(`${API_BASE_URL}/api/cafe/coffee-of-week`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const coffee = await res.json();
    if (coffee && coffee.name) {
      coffeeOfWeekElement.textContent = `${coffee.name} - ${coffee.description} ($${coffee.price.toFixed(2)})`;
    } else {
      coffeeOfWeekElement.textContent = 'No special coffee this week.';
    }
  } catch (err) {
    console.error('Failed to load coffee of the week:', err);
    coffeeOfWeekElement.textContent = 'Failed to load coffee special.';
  }

  // --- Fetch Daily Specials ---
  try {
    // Note: This endpoint needs to be created on your server
    const res = await fetch(`${API_BASE_URL}/api/cafe/daily-specials`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const specials = await res.json();
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
  } catch (err) {
    console.error('Failed to load daily specials:', err);
    dailySpecialsList.innerHTML = '<li>Failed to load daily specials.</li>';
  }

  // --- Search Functionality ---
  searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (query.length === 0) {
      searchResultsContainer.innerHTML = '<p>Please enter a search term.</p>';
      return;
    }

    searchResultsContainer.innerHTML = '<h2>Searching Open Library...</h2>'; // Clear previous results

    try {
      // Send request to your backend's Open Library proxy endpoint
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
        data.docs.forEach(book => {
          const card = document.createElement('div');
          card.className = 'book-card';
          const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'https://via.placeholder.com/200x300/f0f0f0/888?text=No+Cover';

          card.innerHTML = `
            <img src="${coverUrl}" alt="${book.title}">
            <h3>${book.title}</h3>
            <p>${book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
            <p>First Publish Year: ${book.first_publish_year || 'N/A'}</p>
            <p>ISBN: ${book.isbn ? book.isbn[0] : 'N/A'}</p>
            <button class="add-to-cart-btn" data-book-id="${book.key}">Add to Inventory (Admin)</button>
          `;
          searchResultsContainer.appendChild(card);
        });
      } else {
        searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>No results found. Try a different search term.</p>';
      }

    } catch (err) {
      console.error('Failed to search Open Library:', err);
      searchResultsContainer.innerHTML = '<h2>Search Results from Open Library</h2><p>Failed to perform search. Please try again later.</p>';
    }
  });
  // --- Update Cart Count Function (mock for now) ---
  function updateCartCount(change) {
    let currentCount = parseInt(cartCountElement.textContent);
    cartCountElement.textContent = currentCount + change;
  }
  // For a real app, you'd fetch the actual cart count on page load
  // fetch('http://localhost:5000/api/cart').then(res => res.json()).then(cart => cartCountElement.textContent = cart.items.length || 0);
});