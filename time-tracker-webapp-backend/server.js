// Local / traditional-server entry point. On Vercel, api/index.js is used instead.
let app;
try {
  app = require('./app');
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// Connect eagerly so a bad MONGODB_URI is reported at startup
app.connectDB().catch(error => {
  console.error('Failed to connect to MongoDB', error);
  process.exit(1);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
