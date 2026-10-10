const mongoose = require('mongoose');
const User = require('../models/User');
const Shift = require('../models/Shift');
const { computeShiftTimes, formatDuration } = require('../utils/shiftTime');
const { isBootstrapAdmin } = require('../utils/adminEmails');
const { reportForClient } = require('../utils/reportRules');

const MAX_PAGE_SIZE = 200;

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt
});

// Get all employees
const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await User.find().select('-password').sort({ name: 1 });
    res.json(employees.map(toPublicUser));
  } catch (error) {
    next(error);
  }
};

// Create an employee account (public registration is closed)
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email: String(email || '').toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const user = await User.create({ name, email, password, role });
    res.status(201).json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
};

// Guard against admins locking themselves (or the bootstrap admins) out
const checkProtectedUser = (req, user) => {
  if (user._id.equals(req.user._id)) {
    return 'You cannot change your own role or status';
  }
  if (isBootstrapAdmin(user.email)) {
    return 'This admin is listed in ADMIN_EMAILS and cannot be demoted or deactivated';
  }
  return null;
};

// Update employee role
const updateEmployeeRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;

    // Validate role
    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const protectedMessage = checkProtectedUser(req, user);
    if (protectedMessage) {
      return res.status(400).json({ message: protectedMessage });
    }

    user.role = role;
    await user.save();

    res.json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
};

// Activate/deactivate employee
const toggleEmployeeStatus = async (req, res, next) => {
  try {
    const { userId, active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'active must be true or false' });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const protectedMessage = checkProtectedUser(req, user);
    if (protectedMessage) {
      return res.status(400).json({ message: protectedMessage });
    }

    user.active = active;
    await user.save();

    res.json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
};

// Reset an employee's password (e.g. a new temporary password)
const resetEmployeePassword = async (req, res, next) => {
  try {
    const { userId, password } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hashed by the User pre-save hook; length validated by the schema
    user.password = password;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

// Change an employee's login email
const updateEmployeeEmail = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.email === email) {
      return res.json(toPublicUser(user));
    }

    // ADMIN_EMAILS grants admin rights by email, so moving an email into or
    // out of that list would silently change who is an admin
    if (isBootstrapAdmin(user.email)) {
      return res.status(400).json({ message: 'This admin is listed in ADMIN_EMAILS; change their email in the server configuration instead' });
    }
    if (isBootstrapAdmin(email)) {
      return res.status(400).json({ message: 'That email is reserved in ADMIN_EMAILS' });
    }

    const existing = await User.findOne({ email, _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Format is validated by the User schema
    user.email = email;
    await user.save();

    res.json(toPublicUser(user));
  } catch (error) {
    next(error);
  }
};

// Delete an employee account; their shifts are kept for payroll records
const deleteEmployee = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    if (isBootstrapAdmin(user.email)) {
      return res.status(400).json({ message: 'This admin is listed in ADMIN_EMAILS and cannot be deleted' });
    }

    const openShift = await Shift.findOne({ employeeId: user._id, endTime: null });
    if (openShift) {
      return res.status(400).json({
        message: `${user.name} is still clocked in. Close their open shift in the Shifts tab first.`
      });
    }

    // Label their history before removing the account
    const { modifiedCount } = await Shift.updateMany(
      { employeeId: user._id },
      { $set: { employeeSnapshot: { name: user.name, email: user.email, deletedAt: new Date() } } }
    );
    await User.deleteOne({ _id: user._id });

    res.json({
      message: `${user.name} was deleted`,
      preservedShifts: modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

// Display name for a shift whose employee may have been deleted
const employeeLabel = (shift) => {
  if (shift.employeeId?.name) return { name: shift.employeeId.name, email: shift.employeeId.email };
  if (shift.employeeSnapshot?.name) {
    return { name: `${shift.employeeSnapshot.name} (deleted)`, email: shift.employeeSnapshot.email };
  }
  return { name: 'Deleted user', email: '' };
};

// Build a Mongo filter from ?employeeId=&from=&to=
// from/to are ISO timestamps computed in the admin's own timezone
const buildShiftFilter = (query) => {
  const filter = {};

  if (query.employeeId) {
    if (!mongoose.isValidObjectId(query.employeeId)) {
      return { error: 'Invalid employee id' };
    }
    filter.employeeId = query.employeeId;
  }

  if (query.from || query.to) {
    filter.startTime = {};
    if (query.from) {
      const from = new Date(query.from);
      if (isNaN(from)) return { error: 'Invalid from date' };
      filter.startTime.$gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (isNaN(to)) return { error: 'Invalid to date' };
      filter.startTime.$lt = to;
    }
  }

  if (query.siteId) {
    if (!mongoose.isValidObjectId(query.siteId)) {
      return { error: 'Invalid site id' };
    }
    filter['report.site.id'] = new mongoose.Types.ObjectId(query.siteId);
  }

  if (query.hasIssues === 'true') {
    filter['report.issues.0'] = { $exists: true };
  }

  return { filter };
};

// Shift plus server-computed durations and report summary, so every view agrees
const withTimes = (shift, now) => {
  const plain = shift.toObject();
  const { totalWorkingTime, totalBreakTime } = computeShiftTimes(plain, now);
  const { report, ...rest } = plain;
  return {
    ...rest,
    employeeName: employeeLabel(plain).name,
    employeeDeleted: !plain.employeeId,
    open: !plain.endTime,
    workingTime: totalWorkingTime,
    breakTime: totalBreakTime,
    site: report?.site?.name || null,
    photoCount: report?.photos?.length || 0,
    taskCount: report?.tasks?.length || 0,
    issues: (report?.issues || []).map(issue => issue.label),
    hasNote: Boolean(report?.note)
  };
};

// Full report for one shift, with short-lived photo URLs
const getShiftReport = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    if (!mongoose.isValidObjectId(shiftId)) {
      return res.status(400).json({ message: 'Invalid shift id' });
    }
    const shift = await Shift.findById(shiftId)
      .populate('employeeId', 'name email')
      .populate('editedBy', 'name');
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    res.json({
      shift: withTimes(shift, new Date()),
      report: await reportForClient(shift)
    });
  } catch (error) {
    next(error);
  }
};

// Get shifts (filterable by employee and date range, paginated)
const getAllShifts = async (req, res, next) => {
  try {
    const { filter, error } = buildShiftFilter(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;
    const now = new Date();

    const [total, shifts, allMatching] = await Promise.all([
      Shift.countDocuments(filter),
      Shift.find(filter)
        .populate('employeeId', 'name email')
        .populate('editedBy', 'name')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit),
      // Lightweight query for the range total across all pages
      Shift.find(filter).select('startTime endTime breaks').lean()
    ]);

    const totalWorkingTime = allMatching.reduce(
      (sum, shift) => sum + computeShiftTimes(shift, now).totalWorkingTime,
      0
    );

    res.json({
      shifts: shifts.map(shift => withTimes(shift, now)),
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      total,
      totalWorkingTime,
      openCount: allMatching.filter(shift => !shift.endTime).length
    });
  } catch (error) {
    next(error);
  }
};

// Quote a CSV cell and neutralise spreadsheet formulas
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

// Export all matching shifts (no pagination) as CSV
const exportShiftsCsv = async (req, res, next) => {
  try {
    const { filter, error } = buildShiftFilter(req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    // Format times in the admin's timezone, not the server's
    let timeZone = 'UTC';
    try {
      if (req.query.tz) {
        new Intl.DateTimeFormat('en-US', { timeZone: req.query.tz });
        timeZone = req.query.tz;
      }
    } catch {
      return res.status(400).json({ message: 'Invalid timezone' });
    }

    const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
    const now = new Date();

    const shifts = await Shift.find(filter)
      .populate('employeeId', 'name email')
      .populate('editedBy', 'name')
      .sort({ startTime: 1 })
      .lean();

    const header = [
      'Employee', 'Email', 'Date', 'Start', 'End', 'Status',
      'Break (h:m)', 'Worked (h:m)', 'Worked (decimal hours)', 'Breaks',
      'Site', 'Tasks', 'Issues', 'Note', 'Photos',
      'Start Latitude', 'Start Longitude', 'Edited By', 'Edit Note'
    ];
    const labels = (items) => (items || []).map(item => item.label).join('; ');

    const rows = shifts.map(shift => {
      const { totalWorkingTime, totalBreakTime } = computeShiftTimes(shift, now);
      const start = new Date(shift.startTime);
      const employee = employeeLabel(shift);
      return [
        employee.name,
        employee.email,
        dateFmt.format(start),
        timeFmt.format(start),
        shift.endTime ? timeFmt.format(new Date(shift.endTime)) : '',
        shift.endTime ? 'Closed' : 'Open',
        formatDuration(totalBreakTime),
        formatDuration(totalWorkingTime),
        (totalWorkingTime / (1000 * 60 * 60)).toFixed(2),
        (shift.breaks || []).length,
        shift.report?.site?.name || '',
        labels(shift.report?.tasks),
        labels(shift.report?.issues),
        shift.report?.note || '',
        shift.report?.photos?.length || 0,
        shift.location?.latitude?.toFixed(6) ?? '',
        shift.location?.longitude?.toFixed(6) ?? '',
        shift.editedBy?.name || '',
        shift.editNote || ''
      ].map(csvCell).join(',');
    });

    const csv = [header.map(csvCell).join(','), ...rows].join('\n');
    const filename = `shifts_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Business rules for an admin correcting a shift's times.
 * Basic sanity (valid dates, end after start, overlaps) is checked by the caller.
 *
 * @param {Date} startTime - proposed shift start
 * @param {Date|null} endTime - proposed shift end (null = shift stays open)
 * @param {Date} now - current server time
 * @param {object} [options]
 * @param {boolean} [options.allowLong] - admin confirmed a shift over MAX_SHIFT_HOURS is real
 * @param {boolean} [options.closingOpen] - closing a forgotten open shift, allowed at any age
 * @returns {{ message: string, code?: string }|null} why the edit is rejected, or null to allow it
 */
const MAX_SHIFT_HOURS = Number(process.env.MAX_SHIFT_HOURS) || 24;
const MAX_EDIT_AGE_DAYS = Number(process.env.MAX_EDIT_AGE_DAYS) || 90;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const validateShiftEditPolicy = (startTime, endTime, now, { allowLong = false, closingOpen = false } = {}) => {
  if (startTime > now.getTime() + CLOCK_SKEW_MS || (endTime && endTime > now.getTime() + CLOCK_SKEW_MS)) {
    return { message: 'Shift times cannot be in the future' };
  }
  // Long shifts are usually a typo in the date, so ask before saving rather
  // than refusing outright (genuine double shifts and late closes happen)
  if (endTime && !allowLong && endTime - startTime > MAX_SHIFT_HOURS * 60 * 60 * 1000) {
    return {
      code: 'LONG_SHIFT',
      message: `This shift would be ${formatDuration(endTime - startTime)} long, over ${MAX_SHIFT_HOURS} hours. Check the dates, or confirm it really was this long.`
    };
  }
  if (!closingOpen && now - startTime > MAX_EDIT_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return { message: `Shifts older than ${MAX_EDIT_AGE_DAYS} days cannot be edited` };
  }
  return null;
};

// Another shift of this employee overlapping [start, end) would double-count pay
const findOverlappingShift = (employeeId, start, end, excludeShiftId = null) => {
  const query = {
    employeeId,
    startTime: { $lt: end || new Date(8.64e15) },
    $or: [{ endTime: null }, { endTime: { $gt: start } }]
  };
  if (excludeShiftId) query._id = { $ne: excludeShiftId };
  return Shift.findOne(query);
};

// 400 body naming the shift in the way, so the admin knows what to fix.
// Times are sent raw; the client formats them in the admin's timezone.
const overlapResponse = (conflict) => ({
  code: 'OVERLAP',
  conflict: {
    _id: conflict._id,
    startTime: conflict.startTime,
    endTime: conflict.endTime || null,
    open: !conflict.endTime
  },
  message: conflict.endTime
    ? 'This overlaps another shift for this employee'
    : 'This employee has a shift that is still open from an earlier date. Close that shift first.'
});

// Keep breaks inside [start, end]: drop ones entirely outside, clamp the rest
const fitBreaksToShift = (breaks, start, end) => {
  for (let i = breaks.length - 1; i >= 0; i--) {
    const item = breaks[i];
    if ((end && item.startTime >= end) || (item.endTime && item.endTime <= start)) {
      breaks.splice(i, 1);
      continue;
    }
    if (item.startTime < start) item.startTime = start;
    if (end && (!item.endTime || item.endTime > end)) item.endTime = end;
  }
};

// Admin adds a closed shift for a day the employee forgot to clock in
const createShift = async (req, res, next) => {
  try {
    const { employeeId, startTime, endTime, note } = req.body;
    const breakMinutes = req.body.breakMinutes === undefined || req.body.breakMinutes === ''
      ? 0
      : Number(req.body.breakMinutes);

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }
    if (!note || !String(note).trim()) {
      return res.status(400).json({ message: 'A note explaining the entry is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
      return res.status(400).json({ message: 'Break must be a whole number of minutes, 0 or more' });
    }
    // A break as long as the shift would leave nothing worked
    if (breakMinutes * 60 * 1000 >= end - start) {
      return res.status(400).json({ message: 'Break must be shorter than the shift' });
    }

    const policyError = validateShiftEditPolicy(start, end, new Date(), {
      allowLong: req.body.allowLong === true
    });
    if (policyError) {
      return res.status(400).json(policyError);
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!employee.active) {
      return res.status(400).json({ message: `${employee.name} is deactivated` });
    }

    const conflict = await findOverlappingShift(employee._id, start, end);
    if (conflict) {
      return res.status(400).json(overlapResponse(conflict));
    }

    // Recorded as one short break centred in the shift, so the standard
    // duration math and CSV export need no special case for manual shifts
    const breaks = [];
    if (breakMinutes > 0) {
      const breakMs = breakMinutes * 60 * 1000;
      const breakStart = new Date(start.getTime() + (end - start - breakMs) / 2);
      breaks.push({ type: 'SHORT', startTime: breakStart, endTime: new Date(breakStart.getTime() + breakMs) });
    }

    const shift = new Shift({
      employeeId: employee._id,
      startTime: start,
      endTime: end,
      breaks,
      manual: true,
      editedBy: req.user._id,
      editedAt: new Date(),
      editNote: String(note).trim()
    });
    shift.updateTotals();
    await shift.save();
    await shift.populate('employeeId', 'name email');
    await shift.populate('editedBy', 'name');

    res.status(201).json(withTimes(shift, new Date()));
  } catch (error) {
    next(error);
  }
};

// Admin correction of a shift (e.g. closing a forgotten clock-out)
const updateShift =async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    const { startTime, endTime, note } = req.body;

    if (!mongoose.isValidObjectId(shiftId)) {
      return res.status(400).json({ message: 'Invalid shift id' });
    }
    if (!note || !String(note).trim()) {
      return res.status(400).json({ message: 'A note explaining the correction is required' });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    const newStart = startTime ? new Date(startTime) : shift.startTime;
    // endTime omitted keeps the existing value; shifts cannot be re-opened
    const newEnd = endTime ? new Date(endTime) : shift.endTime || null;

    if (isNaN(newStart) || (newEnd && isNaN(newEnd))) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    if (newEnd && newEnd <= newStart) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const policyError = validateShiftEditPolicy(newStart, newEnd, new Date(), {
      allowLong: req.body.allowLong === true,
      closingOpen: !shift.endTime && newStart.getTime() === shift.startTime.getTime()
    });
    if (policyError) {
      return res.status(400).json(policyError);
    }

    const conflict = await findOverlappingShift(shift.employeeId, newStart, newEnd, shift._id);
    if (conflict) {
      return res.status(400).json(overlapResponse(conflict));
    }

    shift.startTime = newStart;
    // Also closes any break left open by a forgotten clock-out
    fitBreaksToShift(shift.breaks, newStart, newEnd);

    if (newEnd) {
      shift.endTime = newEnd;
      shift.onBreak = false;
      shift.breakType = null;
      shift.updateTotals();
    }

    shift.editedBy = req.user._id;
    shift.editedAt = new Date();
    shift.editNote = String(note).trim();

    await shift.save();
    await shift.populate('employeeId', 'name email');
    await shift.populate('editedBy', 'name');

    res.json(withTimes(shift, new Date()));
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
