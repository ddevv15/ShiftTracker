const mongoose = require('mongoose');
const { computeShiftTimes } = require('../utils/shiftTime');

// Location schema
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number
  }
}, { _id: false });

// Break schema
const breakSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LUNCH', 'SHORT'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  // Locations are optional unless REQUIRE_LOCATION=true (enforced in the controller)
  location: {
    type: locationSchema
  },
  endLocation: {
    type: locationSchema
  }
}, { _id: false });

// Shift report: what was done, where, with photo proof.
// Labels are copied in so renaming a site/option never rewrites history.
const labelRefSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, required: true },
  label: { type: String, required: true }
}, { _id: false });

const photoSchema = new mongoose.Schema({
  key: { type: String, required: true },
  tag: { type: String, enum: ['BEFORE', 'DURING', 'AFTER'], required: true },
  takenAt: { type: Date, required: true },
  location: { type: locationSchema },
  size: { type: Number }
});

const reportSchema = new mongoose.Schema({
  site: {
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String }
  },
  tasks: [labelRefSchema],
  issues: [labelRefSchema],
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note must be 500 characters or less']
  },
  photos: [photoSchema],
  submittedAt: { type: Date }
}, { _id: false });

// Shift schema
const shiftSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  // true while the shift is open, removed when closed; backs the unique
  // index below so an employee can never have two open shifts
  isOpen: {
    type: Boolean
  },
  location: {
    type: locationSchema
  },
  endLocation: {
    type: locationSchema
  },
  breaks: [breakSchema],
  onBreak: {
    type: Boolean,
    default: false
  },
  breakType: {
    type: String,
    enum: ['LUNCH', 'SHORT', null],
    default: null
  },
  totalWorkingTime: {
    type: Number
  },
  totalBreakTime: {
    type: Number
  },
  // Updated field-by-field ($set/$push) so concurrent autosaves and photo
  // uploads never overwrite each other
  report: {
    type: reportSchema
  },
  // Name/email copied here when the employee account is deleted, so the
  // shift history stays attributable in reports and CSV exports
  employeeSnapshot: {
    name: { type: String },
    email: { type: String },
    deletedAt: { type: Date }
  },
  // Audit trail for admin corrections (e.g. forgotten clock-outs)
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  editedAt: {
    type: Date
  },
  editNote: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

shiftSchema.index({ employeeId: 1, startTime: -1 });
shiftSchema.index(
  { employeeId: 1 },
  { unique: true, partialFilterExpression: { isOpen: true }, name: 'one_open_shift_per_employee' }
);

shiftSchema.pre('save', function(next) {
  this.isOpen = this.endTime ? undefined : true;
  next();
});

// Recalculate and store totals; call before saving a closed shift
shiftSchema.methods.updateTotals = function() {
  if (!this.endTime) return;
  const { totalWorkingTime, totalBreakTime } = computeShiftTimes(this);
  this.totalWorkingTime = totalWorkingTime;
  this.totalBreakTime = totalBreakTime;
};

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;