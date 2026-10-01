// The Express app, shared by the local server (server.js) and the Vercel
// serverless function (api/index.js at the repo root).
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { validateConfig, getCorsOrigin } = require('./utils/config');

// Refuse to run with unsafe configuration
validateConfig();

// Import routes
const authRoutes = require('./routes/authRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getReportOptions } = require('./controllers/reportController');

// Import middleware
const { handleError } = require('./middleware/errorHandler');
const { authenticateJWT } = require('./middleware/auth');

const isVercel = Boolean(process.env.VERCEL);

// Connect once per process and reuse the connection across requests
// (serverless instances stay warm between invocations)
let connection = null;
const connectDB = () => {
  if (!connection) {
    connection = mongoose
      .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-tracker', {
        serverSelectionTimeoutMS: 10000
      })
      .then(() => console.log('Connected to MongoDB'))
      .catch(error => {
        connection = null; // allow the next request to retry
        throw error;
      });
  }
  return connection;
};

// Initialize Express app
const app = express();

// Correct client IPs for rate limiting behind Vercel or another proxy
if (isVercel) {
  app.set('trust proxy', 1);
} else if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

// Middleware
app.use(cors({ origin: getCorsOrigin() }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Make sure the database is reachable before handling API requests
app.use('/api', (req, res, next) => {
  connectDB()
    .then(() => next())
    .catch(error => {
      console.error('Failed to connect to MongoDB', error);
      res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shifts', authenticateJWT, shiftRoutes);
app.get('/api/report-options', authenticateJWT, getReportOptions);
app.use('/api/admin', authenticateJWT, adminRoutes);

// Unknown API routes return JSON 404 instead of the SPA
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Serve the built frontend in production (on Vercel the CDN serves it instead)
if (process.env.NODE_ENV === 'production' && !isVercel) {
  const frontendDist = path.join(__dirname, '../time-tracker-webapp-frontend/dist');

  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    console.warn(`Frontend build not found at ${frontendDist}. Run "npm run build" in the frontend.`);
  }
}

// Error handling middleware
app.use(handleError);

module.exports = app;
module.exports.connectDB = connectDB;
