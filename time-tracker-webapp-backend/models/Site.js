const mongoose = require('mongoose');

// A job site workers can pick for their shift report
const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
    maxlength: [100, 'Site name must be 100 characters or less']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address must be 200 characters or less']
  },
  // Optional; enables the "nearest site" suggestion
  location: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  // Hidden sites stay on old reports but can't be picked
  active: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Site', siteSchema);
