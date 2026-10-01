const Site = require('../models/Site');
const ReportOption = require('../models/ReportOption');
const { signedPhotoUrl, isConfigured } = require('./photoStorage');

const MAX_PHOTOS = 20;

// A report is only required once the admin has set up at least one site
// and one task, so nobody is blocked from ending a shift before setup
const isReportRequired = async () => {
  const [site, task] = await Promise.all([
    Site.exists({ active: true }),
    ReportOption.exists({ type: 'task', active: true })
  ]);
  return Boolean(site && task);
};

const missingReportFields = (shift) => {
  const report = shift.report || {};
  const missing = [];
  if (!report.site?.id) missing.push('site');
  if (!report.tasks?.length) missing.push('tasks');
  return missing;
};

// Report shape sent to clients, with short-lived photo URLs
const reportForClient = async (shift) => {
  const raw = shift.report?.toObject ? shift.report.toObject() : (shift.report || {});
  const canSign = isConfigured();

  const photos = await Promise.all((raw.photos || []).map(async photo => ({
    _id: photo._id,
    tag: photo.tag,
    takenAt: photo.takenAt,
    location: photo.location || null,
    url: canSign ? await signedPhotoUrl(photo.key) : null
  })));

  return {
    shiftId: shift._id,
    site: raw.site?.id ? raw.site : null,
    tasks: raw.tasks || [],
    issues: raw.issues || [],
    note: raw.note || '',
    photos,
    submittedAt: raw.submittedAt || null
  };
};

module.exports = {
  MAX_PHOTOS,
  isReportRequired,
  missingReportFields,
  reportForClient
};
