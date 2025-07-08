// server/server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express'); // Import Express framework
const connectDB = require('./config/db'); // Import the centralized database connection
const cors = require('cors'); // Import CORS middleware for cross-origin requests

// Import routes and controllers
const authRoute = require('./routes/auth');
const booksRoute = require('./routes/books');
const orderRoute = require('./routes/order');
const adminRoute = require('./routes/admin');
const squareWebhook = require('./controllers/squareWebhook');
const cafeRoute = require('./routes/cafe');
const openLibraryRoute = require('./routes/openLibrary');

// Placeholder for future routes (you'll need to create these files)
// const cartRoute = require('./routes/cart');
// const cafeRoute = require('./routes/cafe');
// const tradeInRoute = require('./routes/tradeIn');
// const userRoute = require('./routes/user');

const app = express(); // Initialize Express app
const PORT = process.env.PORT || 5000; // Define server port

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for all routes (configure specific origins in production for security)
app.use(express.json()); // Body parser for JSON requests

// Route Mounting
app.use('/api/auth', authRoute);
app.use('/api/books', booksRoute);
app.use('/api/orders', orderRoute);
app.use('/api/admin', adminRoute);
app.post('/api/webhooks/square', squareWebhook);
app.use('/api/cafe', cafeRoute);
app.use('/api/openlibrary', openLibraryRoute)

// Future routes to add (uncomment and require them when ready):
// app.use('/api/cart', cartRoute);
// app.use('/api/cafe', cafeRoute);
// app.use('/api/trade-ins', tradeInRoute);
// app.use('/api/users', userRoute);

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('Bookstore API is running');
});

// Global Error Handling Middleware (optional but recommended for production)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the full error stack
    res.status(500).send('Something broke!'); // Send a generic error response
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));