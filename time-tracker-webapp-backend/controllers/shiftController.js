const Shift = require('../models/Shift');
const { startOfDay, startOfWeek, startOfMonth } = require('date-fns');
const { sendShiftStartEmail, sendShiftEndEmail } = require('../utils/emailService');
const { computeShiftTimes } = require('../utils/shiftTime');
const { isLocationRequired } = require('../utils/config');
const { waitUntil } = require('@vercel/functions');
const { parseLocation } = require('../utils/location');
const { isReportRequired, missingReportFields } = require('../utils/reportRules');

const LOCATION_REQUIRED_MESSAGE =
  'Location is required. Please allow location access in your browser and try again.';

// Returns the parsed location, or sends a 400 and returns undefined
const requireLocation = (req, res) => {
  const location = parseLocation(req.body?.location);
  if (!location && isLocationRequired()) {
    res.status(400).json({ message: LOCATION_REQUIRED_MESSAGE });
    return undefined;
  }
  return location;
};

const findOpenShift = (employeeId) =>
  Shift.findOne({ employeeId, endTime: null }).sort({ startTime: -1 });

// Get current active shift
const getCurrentShift = async (req, res, next) => {
  try {
    const shift = await findOpenShift(req.user._id);
    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// Start a new shift
const startShift = async (req, res, next) => {
  try {
    const location = requireLocation(req, res);
    if (location === undefined) return;

    // Check if there's already an active shift
    const activeShift = await findOpenShift(req.user._id);
    if (activeShift) {
      return res.status(400).json({ message: 'You already have an active shift' });
    }

    let shift;
    try {
      shift = await Shift.create({
        employeeId: req.user._id,
        startTime: new Date(),
        ...(location ? { location } : {}),
        breaks: []
      });
    } catch (error) {
      // Two simultaneous clock-ins: the unique open-shift index rejects one
      if (error.code === 11000) {
        return res.status(400).json({ message: 'You already have an active shift' });
      }
      throw error;
    }

    // Send email without blocking the response; waitUntil keeps a serverless
    // function alive until it finishes (no-op on a regular server)
    waitUntil(sendShiftStartEmail(req.user, shift)
      .catch(err => console.error('Error sending shift start email:', err)));

    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

// End current shift
const endShift = async (req, res, next) => {
  try {
    const location = requireLocation(req, res);
    if (location === undefined) return;

    const shift = await findOpenShift(req.user._id);
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }

    // Shift report must name the site and at least one task (once set up)
    if (await isReportRequired()) {
      const missing = missingReportFields(shift);
      if (missing.length > 0) {
        return res.status(400).json({
          code: 'REPORT_INCOMPLETE',
          missing,
          message: 'Pick your site and at least one task before ending your shift'
        });
      }
    }

    const now = new Date();
    shift.set('report.submittedAt', now);

    // If on break, end the break first
    if (shift.onBreak) {
      const currentBreak = shift.breaks[shift.breaks.length - 1];
      currentBreak.endTime = now;
      if (location) currentBreak.endLocation = location;
      shift.onBreak = false;
      shift.breakType = null;
    }

    shift.endTime = now;
    if (location) shift.endLocation = location;

    // Store working and break totals
    shift.updateTotals();

    await shift.save();

    // Send email without blocking the response (see startShift)
    waitUntil(sendShiftEndEmail(req.user, shift)
      .catch(err => console.error('Error sending shift end email:', err)));

    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// Start a break
const startBreak = async (req, res, next) => {
  try {
    const { type } = req.body;

    // Validate break type
    if (!['LUNCH', 'SHORT'].includes(type)) {
      return res.status(400).json({ message: 'Invalid break type' });
    }

    const location = requireLocation(req, res);
    if (location === undefined) return;

    const shift = await findOpenShift(req.user._id);
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }

    if (shift.onBreak) {
      return res.status(400).json({ message: 'You are already on break' });
    }

    shift.breaks.push({
      type,
      startTime: new Date(),
      ...(location ? { location } : {})
    });
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
    const location = requireLocation(req, res);
    if (location === undefined) return;

    const shift = await Shift.findOne({
      employeeId: req.user._id,
      endTime: null,
      onBreak: true
    });

    if (!shift) {
      return res.status(404).json({ message: 'No active break found' });
    }

    // The current break is the last one in the array
    const currentBreak = shift.breaks[shift.breaks.length - 1];
    currentBreak.endTime = new Date();
    if (location) currentBreak.endLocation = location;

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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [total, shifts] = await Promise.all([
      Shift.countDocuments({ employeeId: req.user._id }),
      Shift.find({ employeeId: req.user._id })
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
    ]);

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

// Parse an ISO boundary sent by the client, falling back to a server value
const parseBoundary = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  return isNaN(date) ? fallback : date;
};

// Get shift statistics
// The client sends dayStart/weekStart/monthStart computed in its own
// timezone, so "today" means the employee's today, not the server's.
const getShiftStatistics = async (req, res, next) => {
  try {
    const now = new Date();
    const dayStart = parseBoundary(req.query.dayStart, startOfDay(now));
    const weekStart = parseBoundary(req.query.weekStart, startOfWeek(now, { weekStartsOn: 1 }));
    const monthStart = parseBoundary(req.query.monthStart, startOfMonth(now));
    const earliest = new Date(Math.min(dayStart, weekStart, monthStart));

    // Every shift overlapping the widest window (including ones started
    // before it, e.g. a night shift that began yesterday)
    const shifts = await Shift.find({
      employeeId: req.user._id,
      startTime: { $lt: now },
      $or: [{ endTime: null }, { endTime: { $gt: earliest } }]
    }).lean();

    const hoursSince = (from) => {
      const window = { from, to: now };
      const totalMs = shifts.reduce(
        (total, shift) => total + computeShiftTimes(shift, now, window).totalWorkingTime,
        0
      );
      return totalMs / (1000 * 60 * 60);
    };

    res.json({
      today: hoursSince(dayStart),
      weekly: hoursSince(weekStart),
      monthly: hoursSince(monthStart)
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
