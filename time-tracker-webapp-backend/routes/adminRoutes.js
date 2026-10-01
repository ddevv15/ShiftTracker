const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  createEmployee,
  updateEmployeeRole,
  toggleEmployeeStatus,
  resetEmployeePassword,
  updateEmployeeEmail,
  getAllShifts,
  exportShiftsCsv,
  updateShift
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

// All routes need admin privileges
router.use(isAdmin);

// Employee routes
router.get('/employees', getAllEmployees);
router.post('/employees', createEmployee);
router.put('/employees/role', updateEmployeeRole);
router.put('/employees/status', toggleEmployeeStatus);
router.put('/employees/password', resetEmployeePassword);
router.put('/employees/email', updateEmployeeEmail);

// Shift routes (filter with ?employeeId=&from=&to=)
router.get('/shifts', getAllShifts);
router.get('/shifts/export', exportShiftsCsv);
router.put('/shifts/:shiftId', updateShift);

module.exports = router;
