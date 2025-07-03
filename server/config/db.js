// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // Use environment variable for URI
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message); // More descriptive error
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;