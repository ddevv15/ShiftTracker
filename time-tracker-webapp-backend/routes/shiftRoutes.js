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
const {
  getCurrentReport,
  updateCurrentReport,
  uploadPhoto,
  removePhoto,
  getOwnShiftReport
} = require('../controllers/reportController');

// Photos arrive as raw image bytes (compressed on the phone); 4 MB keeps
// requests under Vercel's 4.5 MB body limit
const rawImage = express.raw({ type: () => true, limit: '4mb' });

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

// Shift report (open shift)
router.get('/current/report', getCurrentReport);
router.patch('/current/report', updateCurrentReport);
router.post('/current/photos', rawImage, uploadPhoto);
router.delete('/current/photos/:photoId', removePhoto);

// Read-only report for one of your own past shifts
router.get('/:shiftId/report', getOwnShiftReport);

module.exports = router;