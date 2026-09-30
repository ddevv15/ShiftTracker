const express = require('express');
const router = express.Router();
const {
  getCurrentShift,
  startShift,
  endShift,
  startBreak,
  endBreak,
  getShiftHistory,
  getShiftStatistics
} = require('../controllers/shiftController');

// Get current active shift
router.get('/current', getCurrentShift);

// Start a new shift
router.post('/start', startShift);

// End current shift
router.post('/end', endShift);

// Start a break
router.post('/break/start', startBreak);

// End a break
router.post('/break/end', endBreak);

// Get shift history
router.get('/history', getShiftHistory);

// Get shift statistics
router.get('/stats', getShiftStatistics);

module.exports = router;