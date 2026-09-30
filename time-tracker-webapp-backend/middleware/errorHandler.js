
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
    
    // JWT errors are handled in the auth middleware
    
    // Default server error
    return res.status(500).json({ message: 'Server error' });
  };
  
  module.exports = {
    handleError
  };