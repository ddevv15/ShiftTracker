const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Slow down password guessing: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' }
});

// Register a new user
router.post('/register', authLimiter, register);

// Login a user
router.post('/login', authLimiter, login);

// Get current user profile
router.get('/me', authenticateJWT, getCurrentUser);

module.exports = router;
