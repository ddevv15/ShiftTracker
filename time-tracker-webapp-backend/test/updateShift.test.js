const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const { updateShift } = require('../controllers/adminController');

const adminId = new mongoose.Types.ObjectId();
const employeeId = new mongoose.Types.ObjectId();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms);

const openShift = (start, breaks = []) => new Shift({
  employeeId, startTime: start, breaks, onBreak: breaks.some(b => !b.endTime)
});

const run = async (shift, body, { overlap = null } = {}) => {
  const saved = [];
  test.mock.method(Shift, 'findById', async () => shift);
  test.mock.method(Shift, 'findOne', async () => overlap);
  test.mock.method(Shift.prototype, 'save', async function () { saved.push(this); return this; });
  test.mock.method(Shift.prototype, 'populate', async function () { return this; });

  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let nextError = null;
  await updateShift({ params: { shiftId: String(shift._id) }, body, user: { _id: adminId } }, res, (e) => { nextError = e; });
  test.mock.restoreAll();
  return { res, saved, nextError };
};

test('closes a forgotten shift within 24h', async () => {
  const shift = openShift(ago(3 * DAY));
  const { res, saved } = await run(shift, { endTime: new Date(shift.startTime.getTime() + 8 * HOUR).toISOString(), note: 'Forgot' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(saved[0].totalWorkingTime, 8 * HOUR);
});

test('a shift longer than 24h asks for confirmation instead of hard-failing', async () => {
  const shift = openShift(ago(3 * DAY));
  const body = { endTime: new Date(shift.startTime.getTime() + 30 * HOUR).toISOString(), note: 'Double shift' };
  const first = await run(shift, body);
  assert.strictEqual(first.res.statusCode, 400);
  assert.strictEqual(first.res.body.code, 'LONG_SHIFT');
  assert.strictEqual(first.saved.length, 0);

  const second = await run(shift, { ...body, allowLong: true });
  assert.strictEqual(second.res.statusCode, 200);
  assert.strictEqual(second.saved[0].totalWorkingTime, 30 * HOUR);
});

test('an open shift older than the edit window can still be closed', async () => {
  const shift = openShift(ago(120 * DAY));
  const { res } = await run(shift, { endTime: new Date(shift.startTime.getTime() + 8 * HOUR).toISOString(), note: 'Old' });
  assert.strictEqual(res.statusCode, 200);
});

test('closing early drops breaks after the end and clamps an open break', async () => {
  const start = ago(2 * DAY);
  const at = (h) => new Date(start.getTime() + h * HOUR);
  const shift = openShift(start, [
    { type: 'SHORT', startTime: at(2), endTime: at(3) },
    { type: 'LUNCH', startTime: at(5) },            // left open
    { type: 'SHORT', startTime: at(10), endTime: at(11) }
  ]);
  const { res, saved } = await run(shift, { endTime: at(6).toISOString(), note: 'Left at lunch' });
  assert.strictEqual(res.statusCode, 200);
  const breaks = saved[0].breaks;
  assert.strictEqual(breaks.length, 2);
  assert.strictEqual(breaks[1].endTime.getTime(), at(6).getTime());
  assert.strictEqual(saved[0].onBreak, false);
  assert.strictEqual(saved[0].totalBreakTime, 2 * HOUR);
});

test('overlap error names the conflicting shift', async () => {
  const shift = openShift(ago(3 * DAY));
  const conflict = { _id: new mongoose.Types.ObjectId(), startTime: ago(3 * DAY - HOUR), endTime: null };
  const { res } = await run(shift, { endTime: ago(3 * DAY - 8 * HOUR).toISOString(), note: 'x' }, { overlap: conflict });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.code, 'OVERLAP');
  assert.strictEqual(res.body.conflict.open, true);
  assert.match(res.body.message, /still open/i);
});
