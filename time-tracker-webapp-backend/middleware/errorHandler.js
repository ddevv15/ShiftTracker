
// Global error handler middleware
const handleError = (err, req, res, next) => {
    console.error(err);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate field value entered' });
    }
    
    // Request body over the size limit (e.g. an uncompressed photo)
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ message: 'That file is too large' });
    }
    
    // Malformed JSON body
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Invalid request body' });
    }
    
    // JWT errors are handled in the auth middleware
    
    // Default server error
    return res.status(500).json({ message: 'Server error' });
  };
  
  module.exports = {
    handleError
  };