const User = require('../models/User');
const Shift = require('../models/Shift');

// Get all employees
const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await User.find().select('-password');
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Update employee role
const updateEmployeeRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    
    // Validate role
    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update role
    user.role = role;
    await user.save();
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    next(error);
  }
};

// Activate/deactivate employee
const toggleEmployeeStatus = async (req, res, next) => {
  try {
    const { userId, active } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update status
    user.active = active;
    await user.save();
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    next(error);
  }
};

// Get all shifts
const getAllShifts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Count total shifts
    const total = await Shift.countDocuments();
    
    // Get shifts with pagination
    const shifts = await Shift.find()
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      shifts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
};

// Get shifts by employee
const getEmployeeShifts = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Count total shifts for employee
    const total = await Shift.countDocuments({ employeeId });
    
    // Get shifts with pagination
    const shifts = await Shift.find({ employeeId })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      shifts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  updateEmployeeRole,
  toggleEmployeeStatus,
  getAllShifts,
  getEmployeeShifts
};