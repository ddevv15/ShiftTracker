const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Shift = require('../models/Shift');
const { createShift } = require('../controllers/adminController');

const adminId = new mongoose.Types.ObjectId();
const employeeId = new mongoose.Types.ObjectId();
const HOUR = 60 * 60 * 1000;

// A finished shift yesterday, 09:00-17:00 UTC-agnostic (relative to now)
const yesterday = (hour) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

const run = async (body, { employee = { _id: employeeId, name: 'Sam', active: true }, overlap = null } = {}) => {
  const saved = [];
  test.mock.method(User, 'findById', async () => employee);
  test.mock.method(Shift, 'findOne', async () => overlap);
  test.mock.method(Shift.prototype, 'save', async function () { saved.push(this); return this; });
  test.mock.method(Shift.prototype, 'populate', async function () { return this; });

  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let nextError = null;
  await createShift({ body, user: { _id: adminId } }, res, (e) => { nextError = e; });
  test.mock.restoreAll();
  return { res, saved, nextError };
};

const valid = () => ({
  employeeId: String(employeeId),
  startTime: yesterday(9),
  endTime: yesterday(17),
  breakMinutes: 30,
  note: 'Forgot to clock in'
});

test('creates a closed manual shift with break subtracted from worked time', async () => {
  const { res, saved, nextError } = await run(valid());
  assert.strictEqual(nextError, null);
  assert.strictEqual(res.statusCode, 201);
  const shift = saved[0];
  assert.strictEqual(shift.manual, true);
  assert.strictEqual(shift.isOpen, undefined);
  assert.strictEqual(String(shift.editedBy), String(adminId));
  assert.strictEqual(shift.editNote, 'Forgot to clock in');
  assert.strictEqual(shift.breaks.length, 1);
  assert.strictEqual(shift.totalBreakTime, 30 * 60 * 1000);
  assert.strictEqual(shift.totalWorkingTime, 8 * HOUR - 30 * 60 * 1000);
  // break sits inside the shift
  const b = shift.breaks[0];
  assert.ok(b.startTime >= shift.startTime && b.endTime <= shift.endTime);
});

test('break is optional', async () => {
  const body = valid();
  delete body.breakMinutes;
  const { res, saved } = await run(body);
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(saved[0].breaks.length, 0);
  assert.strictEqual(saved[0].totalWorkingTime, 8 * HOUR);
});

const rejects = (name, mutate, expected, opts) =>
  test(`rejects: ${name}`, async () => {
    const body = valid();
    mutate(body);
    const { res, saved } = await run(body, opts);
    assert.strictEqual(res.statusCode, expected.status || 400);
    assert.match(res.body.message, expected.message);
    assert.strictEqual(saved.length, 0);
  });

rejects('missing note', b => { b.note = '  '; }, { message: /note/i });
rejects('invalid employee id', b => { b.employeeId = 'nope'; }, { message: /employee id/i });
rejects('missing end time', b => { delete b.endTime; }, { message: /required/i });
rejects('end before start', b => { b.endTime = b.startTime; }, { message: /after start/i });
rejects('future time', b => { b.startTime = new Date(Date.now() + HOUR).toISOString(); b.endTime = new Date(Date.now() + 2 * HOUR).toISOString(); }, { message: /future/i });
rejects('shift longer than 24h', b => { b.startTime = new Date(Date.now() - 40 * HOUR).toISOString(); b.endTime = new Date(Date.now() - 10 * HOUR).toISOString(); }, { message: /24 hours/ });
rejects('older than 90 days', b => { b.startTime = new Date(Date.now() - 100 * 24 * HOUR).toISOString(); b.endTime = new Date(Date.now() - 100 * 24 * HOUR + 8 * HOUR).toISOString(); }, { message: /90 days/ });
rejects('break as long as shift', b => { b.breakMinutes = 480; }, { message: /shorter than the shift/ });
rejects('negative break', b => { b.breakMinutes = -5; }, { message: /minutes/ });
rejects('fractional break', b => { b.breakMinutes = 12.5; }, { message: /minutes/ });
rejects('unknown employee', () => {}, { status: 404, message: /not found/i }, { employee: null });
rejects('deactivated employee', () => {}, { message: /deactivated/ }, { employee: { _id: employeeId, name: 'Sam', active: false } });
rejects('overlapping shift', () => {}, { message: /overlap/i }, { overlap: { _id: new mongoose.Types.ObjectId(), startTime: yesterday(8), endTime: yesterday(12) } });
rejects('employee still has an open shift', () => {}, { message: /still open/i }, { overlap: { _id: new mongoose.Types.ObjectId(), startTime: yesterday(8), endTime: null } });

test('a shift longer than 24h is saved once the admin confirms it', async () => {
  const body = { ...valid(), startTime: new Date(Date.now() - 40 * HOUR).toISOString(), endTime: new Date(Date.now() - 10 * HOUR).toISOString() };
  const first = await run(body);
  assert.strictEqual(first.res.body.code, 'LONG_SHIFT');
  const second = await run({ ...body, allowLong: true });
  assert.strictEqual(second.res.statusCode, 201);
});
