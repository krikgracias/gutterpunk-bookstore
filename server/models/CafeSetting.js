// server/models/CafeSetting.js
const mongoose = require('mongoose');

const CafeSettingSchema = new mongoose.Schema({
  // A key to distinguish different types of settings (e.g., 'coffeeOfWeek', 'dailySpecials')
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['coffeeOfWeek', 'dailySpecials', 'featuredBooks', 'generalSiteSettings'] // Add more types as needed
  },
  // Data specific to the setting
  value: mongoose.Schema.Types.Mixed, // Use Mixed to store flexible data (objects, arrays)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update 'updatedAt' on save
CafeSettingSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CafeSetting', CafeSettingSchema);