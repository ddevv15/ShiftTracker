const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  createEmployee,
  updateEmployeeRole,
  toggleEmployeeStatus,
  resetEmployeePassword,
  updateEmployeeEmail,
  deleteEmployee,
  getAllShifts,
  getShiftReport,
  exportShiftsCsv,
  createShift,
  updateShift
} =require('../controllers/adminController');
const {
  listSites,
  createSite,
  updateSite,
  listOptions,
  createOption,
  updateOption
} = require('../controllers/setupController');
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
router.delete('/employees/:userId', deleteEmployee);

// Shift routes (filter with ?employeeId=&from=&to=)
router.get('/shifts', getAllShifts);
router.post('/shifts', createShift);
router.get('/shifts/export', exportShiftsCsv);
router.get('/shifts/:shiftId/report', getShiftReport);
router.put('/shifts/:shiftId', updateShift);

// Setup: job sites, tasks and issue flags for shift reports
router.get('/sites', listSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.get('/report-options', listOptions);
router.post('/report-options', createOption);
router.put('/report-options/:id', updateOption);

module.exports = router;
