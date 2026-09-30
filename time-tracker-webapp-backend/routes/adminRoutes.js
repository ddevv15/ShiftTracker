const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  updateEmployeeRole,
  toggleEmployeeStatus,
  getAllShifts,
  getEmployeeShifts
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

// All routes need admin privileges
router.use(isAdmin);

// Employee routes
router.get('/employees', getAllEmployees);
router.put('/employees/role', updateEmployeeRole);
router.put('/employees/status', toggleEmployeeStatus);

// Shift routes
router.get('/shifts', getAllShifts);
router.get('/shifts/:employeeId', getEmployeeShifts);

module.exports = router;