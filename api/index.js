// Vercel serverless entry point: every /api/* request is rewritten here
// (see vercel.json) and handled by the shared Express app.
module.exports = require('../time-tracker-webapp-backend/app');
