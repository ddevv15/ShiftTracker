const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isBootstrapAdmin } = require('../utils/adminEmails');
const { getJwtSecret } = require('../utils/config');

// Helper function to generate JWT
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
};

// Register a new user
// Public sign-up is closed: only emails in ADMIN_EMAILS may self-register
// (as admins). Employees are created by an admin from the dashboard.
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!isBootstrapAdmin(email)) {
      return res.status(403).json({
        message: 'Registration is closed. Ask your admin to create an account for you.'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });
    
    // Generate JWT
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login a user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (!user.active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Bootstrap admins are always restored to admin on login
    if (isBootstrapAdmin(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
};

module.exports = {
  register,
  login,
  getCurrentUser
};