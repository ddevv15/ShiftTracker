const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const ReportOption = require('../models/ReportOption');
const { detectImageType } = require('../utils/imageType');
const { parseLocation } = require('../utils/location');
const { isConfigured, putPhoto, deletePhoto, signedPhotoUrl } = require('../utils/photoStorage');
const { MAX_PHOTOS, isReportRequired, reportForClient } = require('../utils/reportRules');

const PHOTO_TAGS = ['BEFORE', 'DURING', 'AFTER'];
const MAX_NOTE_LENGTH = 500;

const findOpenShift = (employeeId) => Shift.findOne({ employeeId, endTime: null });

// Active pick-lists for the worker's report card
const getReportOptions = async (req, res, next) => {
  try {
    await ReportOption.ensureDefaultIssues();
    const [sites, options, required] = await Promise.all([
      Site.find({ active: true }).select('name address location').sort({ sortOrder: 1, name: 1 }).lean(),
      ReportOption.find({ active: true }).select('type label').sort({ sortOrder: 1, label: 1 }).lean(),
      isReportRequired()
    ]);

    res.json({
      sites,
      tasks: options.filter(option => option.type === 'task'),
      issues: options.filter(option => option.type === 'issue'),
      required
    });
  } catch (error) {
    next(error);
  }
};

// Report for the worker's open shift (null when not clocked in)
const getCurrentReport = async (req, res, next) => {
  try {
    const shift = await findOpenShift(req.user._id);
    res.json(shift ? await reportForClient(shift) : null);
  } catch (error) {
    next(error);
  }
};

// Resolve picked ids to { id, label }. Ids already on the report are kept
// even if the admin has since hidden them; new picks must be active.
const resolveOptions = async (ids, type, existing = []) => {
  if (!Array.isArray(ids)) return { error: `${type === 'task' ? 'taskIds' : 'issueIds'} must be a list` };
  const unique = [...new Set(ids.map(String))];
  if (unique.some(id => !mongoose.isValidObjectId(id))) return { error: 'Invalid option id' };

  const kept = new Map(existing.map(item => [String(item.id), item]));
  const newIds = unique.filter(id => !kept.has(id));
  const found = newIds.length
    ? await ReportOption.find({ _id: { $in: newIds }, type, active: true }).lean()
    : [];
  if (found.length !== newIds.length) {
    return { error: 'Some selected options are no longer available. Refresh and try again.' };
  }
  const labels = new Map(found.map(option => [String(option._id), option.label]));

  return {
    value: unique.map(id => kept.get(id) || { id, label: labels.get(id) })
  };
};

// Autosave the report fields; only the fields sent are changed
const updateCurrentReport = async (req, res, next) => {
  try {
    const shift = await findOpenShift(req.user._id);
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }

    const current = shift.report || {};
    const updates = {};
    const { siteId, taskIds, issueIds, note } = req.body;

    if (siteId !== undefined) {
      if (siteId === null || siteId === '') {
        updates['report.site'] = undefined;
      } else if (String(siteId) === String(current.site?.id)) {
        // unchanged
      } else {
        if (!mongoose.isValidObjectId(siteId)) {
          return res.status(400).json({ message: 'Invalid site id' });
        }
        const site = await Site.findOne({ _id: siteId, active: true }).lean();
        if (!site) {
          return res.status(400).json({ message: 'That site is no longer available. Refresh and try again.' });
        }
        updates['report.site'] = { id: site._id, name: site.name };
      }
    }

    if (taskIds !== undefined) {
      const { value, error } = await resolveOptions(taskIds, 'task', current.tasks);
      if (error) return res.status(400).json({ message: error });
      updates['report.tasks'] = value;
    }

    if (issueIds !== undefined) {
      const { value, error } = await resolveOptions(issueIds, 'issue', current.issues);
      if (error) return res.status(400).json({ message: error });
      updates['report.issues'] = value;
    }

    if (note !== undefined) {
      const text = String(note ?? '').trim();
      if (text.length > MAX_NOTE_LENGTH) {
        return res.status(400).json({ message: `Note must be ${MAX_NOTE_LENGTH} characters or less` });
      }
      updates['report.note'] = text;
    }

    const $set = {};
    const $unset = {};
    Object.entries(updates).forEach(([path, value]) => {
      if (value === undefined) $unset[path] = '';
      else $set[path] = value;
    });

    const updated = await Shift.findOneAndUpdate(
      { _id: shift._id, endTime: null },
      { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'This shift has already ended' });
    }

    res.json(await reportForClient(updated));
  } catch (error) {
    next(error);
  }
};

// Upload one photo (raw image body) to the open shift's report
const uploadPhoto = async (req, res, next) => {
  try {
    const shift = await findOpenShift(req.user._id);
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found' });
    }
    if ((shift.report?.photos?.length || 0) >= MAX_PHOTOS) {
      return res.status(400).json({ message: `You can add up to ${MAX_PHOTOS} photos per shift` });
    }

    const image = detectImageType(req.body);
    if (!image) {
      return res.status(400).json({ message: 'Please upload a JPEG, PNG or WebP photo' });
    }
    if (!isConfigured()) {
      return res.status(503).json({ message: 'Photo storage is not set up yet. Ask your admin.' });
    }

    const tag = PHOTO_TAGS.includes(req.query.tag) ? req.query.tag : 'DURING';
    const takenAtInput = new Date(req.query.takenAt);
    const now = new Date();
    // Trust the phone's capture time only if it's plausible (within this shift)
    const takenAt = !isNaN(takenAtInput) && takenAtInput >= shift.startTime && takenAtInput <= now
      ? takenAtInput
      : now;
    const location = parseLocation({ latitude: req.query.lat, longitude: req.query.lng, accuracy: req.query.acc });

    const photoId = new mongoose.Types.ObjectId();
    const key = `shifts/${shift._id}/${photoId}.${image.ext}`;
    await putPhoto(key, req.body, image.mime);

    const photo = {
      _id: photoId,
      key,
      tag,
      takenAt,
      size: req.body.length,
      ...(location ? { location } : {})
    };

    // Atomic push guarded by the photo limit, so parallel uploads can't exceed it
    const updated = await Shift.findOneAndUpdate(
      { _id: shift._id, endTime: null, [`report.photos.${MAX_PHOTOS - 1}`]: { $exists: false } },
      { $push: { 'report.photos': photo } },
      { new: true }
    );
    if (!updated) {
      await deletePhoto(key).catch(() => {});
      return res.status(400).json({ message: `You can add up to ${MAX_PHOTOS} photos per shift` });
    }

    res.status(201).json({
      _id: photoId,
      tag,
      takenAt,
      location: location || null,
      url: await signedPhotoUrl(key)
    });
  } catch (error) {
    next(error);
  }
};

// Remove a photo from the open shift (e.g. taken by mistake)
const removePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    if (!mongoose.isValidObjectId(photoId)) {
      return res.status(400).json({ message: 'Invalid photo id' });
    }

    const shift = await findOpenShift(req.user._id);
    const photo = shift?.report?.photos?.find(item => String(item._id) === photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found on your current shift' });
    }

    await Shift.updateOne({ _id: shift._id }, { $pull: { 'report.photos': { _id: photo._id } } });
    await deletePhoto(photo.key).catch(error => console.error('Failed to delete photo from storage', error));

    res.json({ message: 'Photo removed' });
  } catch (error) {
    next(error);
  }
};

// Read-only report for one of the worker's own shifts
const getOwnShiftReport = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    if (!mongoose.isValidObjectId(shiftId)) {
      return res.status(400).json({ message: 'Invalid shift id' });
    }
    const shift = await Shift.findOne({ _id: shiftId, employeeId: req.user._id });
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    res.json(await reportForClient(shift));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReportOptions,
  getCurrentReport,
  updateCurrentReport,
  uploadPhoto,
  removePhoto,
  getOwnShiftReport
};
