const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Register a new user
router.post('/register', register);

// Login a user
router.post('/login', login);

// Get current user profile
router.get('/me', authenticateJWT, getCurrentUser);

module.exports = router;