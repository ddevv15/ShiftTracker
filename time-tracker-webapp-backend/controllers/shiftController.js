const Shift = require('../models/Shift');
const User = require('../models/User');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
const { sendShiftStartEmail, sendShiftEndEmail } = require('../utils/emailService');

// Get current active shift
const getCurrentShift = async (req, res, next) => {
  try {
    // Find active shift (one without endTime)
    const shift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null
    }).sort({ startTime: -1 });
    
    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// Start a new shift
const startShift = async (req, res, next) => {
  try {
    // Check if there's already an active shift
    const activeShift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null
    });
    
    if (activeShift) {
      return res.status(400).json({ message: 'You already have an active shift' });
    }
    
    // Create new shift
    const shift = await Shift.create({
      employeeId: req.user._id,
      startTime: new Date(),
      location: req.body.location,
      breaks: []
    });
    
    // Get user's email for notification
    const user = await User.findById(req.user._id);
    
    // Send shift start email notification
    if (user && user.email) {
      // Send email asynchronously - don't await to avoid blocking the response
      sendShiftStartEmail(user, shift)
        .then(() => console.log(`Shift start email sent to ${user.email}`))
        .catch(err => console.error('Error sending shift start email:', err));
    }
    
    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

// End current shift
const endShift = async (req, res, next) => {
  try {
    // Find active shift
    const shift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null
    });
    
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }
    
    // If on break, end the break first
    if (shift.onBreak) {
      const currentBreak = shift.breaks[shift.breaks.length - 1];
      currentBreak.endTime = new Date();
      shift.onBreak = false;
      shift.breakType = null;
    }
    
    // Get location from request body
    const { location } = req.body;
    
    // Update shift with end time and location
    shift.endTime = new Date();
    shift.endLocation = location;
    
    // Calculate total working time
    if (typeof shift.calculateWorkingTime === 'function') {
      shift.totalWorkingTime = shift.calculateWorkingTime();
    } else {
      // Fallback calculation if method is not available
      const totalTime = shift.endTime - new Date(shift.startTime);
      let breakTime = 0;
      
      if (shift.breaks && shift.breaks.length > 0) {
        breakTime = shift.breaks.reduce((total, breakItem) => {
          if (!breakItem.endTime) return total;
          return total + (new Date(breakItem.endTime) - new Date(breakItem.startTime));
        }, 0);
      }
      
      shift.totalWorkingTime = totalTime - breakTime;
    }
    
    // Calculate total break time
    if (shift.breaks && shift.breaks.length > 0) {
      shift.totalBreakTime = shift.breaks.reduce((total, breakItem) => {
        const breakEnd = breakItem.endTime ? new Date(breakItem.endTime) : new Date();
        return total + (breakEnd - new Date(breakItem.startTime));
      }, 0);
    } else {
      shift.totalBreakTime = 0;
    }
    
    await shift.save();
    
    // Get user's email for notification
    const user = await User.findById(req.user._id);
    
    // Send shift end email notification
    if (user && user.email) {
      // Send email asynchronously - don't await to avoid blocking the response
      sendShiftEndEmail(user, shift)
        .then(() => console.log(`Shift end email sent to ${user.email}`))
        .catch(err => console.error('Error sending shift end email:', err));
    }
    
    res.json(shift);
  } catch (error) {
    console.error('Error ending shift:', error);
    next(error);
  }
};

// Start a break
const startBreak = async (req, res, next) => {
  try {
    const { type, location } = req.body;
    
    // Validate break type
    if (!['LUNCH', 'SHORT'].includes(type)) {
      return res.status(400).json({ message: 'Invalid break type' });
    }
    
    // Find active shift
    const shift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null
    });
    
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }
    
    // Check if already on break
    if (shift.onBreak) {
      return res.status(400).json({ message: 'You are already on break' });
    }
    
    // Create a new break
    const newBreak = {
      type,
      startTime: new Date(),
      location
    };
    
    // Add break to shift
    shift.breaks.push(newBreak);
    shift.onBreak = true;
    shift.breakType = type;
    
    await shift.save();
    
    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// End a break
const endBreak = async (req, res, next) => {
  try {
    const { location } = req.body;
    
    // Find active shift
    const shift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null,
      onBreak: true
    });
    
    if (!shift) {
      return res.status(404).json({ message: 'No active break found' });
    }
    
    // Get the current break (the last one in the array)
    const currentBreak = shift.breaks[shift.breaks.length - 1];
    
    // Update break end time and location
    currentBreak.endTime = new Date();
    
    // Update shift status
    shift.onBreak = false;
    shift.breakType = null;
    
    await shift.save();
    
    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// Get shift history
const getShiftHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Count total shifts
    const total = await Shift.countDocuments({ employeeId: req.user._id });
    
    // Get shifts with pagination
    const shifts = await Shift.find({ employeeId: req.user._id })
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

// Get shift statistics
const getShiftStatistics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    
    // Set time ranges
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Get all shifts within the time ranges
    const dailyShifts = await Shift.find({
      employeeId: userId,
      startTime: { $gte: dayStart, $lte: dayEnd }
    });
    
    const weeklyShifts = await Shift.find({
      employeeId: userId,
      startTime: { $gte: weekStart, $lte: weekEnd }
    });
    
    const monthlyShifts = await Shift.find({
      employeeId: userId,
      startTime: { $gte: monthStart, $lte: monthEnd }
    });
    
    // Calculate total hours
    const calculateTotalHours = (shifts) => {
      let totalMs = 0;
      
      shifts.forEach(shift => {
        const startTime = new Date(shift.startTime);
        const endTime = shift.endTime ? new Date(shift.endTime) : new Date();
        
        // Calculate total shift duration
        let shiftDuration = endTime - startTime;
        
        // Subtract break time
        if (shift.breaks && shift.breaks.length > 0) {
          const breakMs = shift.breaks.reduce((total, breakItem) => {
            const breakStart = new Date(breakItem.startTime);
            const breakEnd = breakItem.endTime ? new Date(breakItem.endTime) : new Date();
            return total + (breakEnd - breakStart);
          }, 0);
          
          shiftDuration -= breakMs;
        }
        
        totalMs += shiftDuration;
      });
      
      // Convert milliseconds to hours
      return totalMs / (1000 * 60 * 60);
    };
    
    const dailyHours = calculateTotalHours(dailyShifts);
    const weeklyHours = calculateTotalHours(weeklyShifts);
    const monthlyHours = calculateTotalHours(monthlyShifts);
    
    res.json({
      today: dailyHours,
      weekly: weeklyHours,
      monthly: monthlyHours
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentShift,
  startShift,
  endShift,
  startBreak,
  endBreak,
  getShiftHistory,
  getShiftStatistics
};