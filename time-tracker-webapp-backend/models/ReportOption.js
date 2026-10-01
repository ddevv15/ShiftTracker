const mongoose = require('mongoose');

const DEFAULT_ISSUES = [
  'Needs return visit',
  'Damage found',
  'Safety concern',
  'Waiting on parts',
  'Customer not available'
];

// Tap-to-pick entries for shift reports: tasks done and issue flags
const reportOptionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['task', 'issue'],
    required: true
  },
  label: {
    type: String,
    required: [true, 'Label is required'],
    trim: true,
    maxlength: [60, 'Label must be 60 characters or less']
  },
  // Hidden options stay on old reports but can't be picked
  active: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

reportOptionSchema.index({ type: 1, sortOrder: 1 });

const ReportOption = mongoose.model('ReportOption', reportOptionSchema);

// Seed the starter issue flags the first time options are used
ReportOption.ensureDefaultIssues = async () => {
  const count = await ReportOption.countDocuments({ type: 'issue' });
  if (count > 0) return;
  await ReportOption.insertMany(
    DEFAULT_ISSUES.map((label, index) => ({ type: 'issue', label, sortOrder: index }))
  );
};

module.exports = ReportOption;
