const mongoose = require('mongoose');
const Site = require('../models/Site');
const ReportOption = require('../models/ReportOption');

// Accept { latitude, longitude } or null (to clear); undefined = no change
const parseSiteLocation = (location) => {
  if (location === undefined) return { value: undefined };
  if (location === null) return { value: null };
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { error: 'Invalid location' };
  }
  return { value: { latitude, longitude } };
};

const nextSortOrder = async (Model, filter = {}) => {
  const last = await Model.findOne(filter).sort({ sortOrder: -1 }).select('sortOrder').lean();
  return (last?.sortOrder ?? -1) + 1;
};

// --- Sites ---

const listSites = async (req, res, next) => {
  try {
    res.json(await Site.find().sort({ sortOrder: 1, name: 1 }));
  } catch (error) {
    next(error);
  }
};

const createSite = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const { value: location, error } = parseSiteLocation(req.body.location);
    if (error) return res.status(400).json({ message: error });

    const site = await Site.create({
      name,
      address,
      ...(location ? { location } : {}),
      sortOrder: await nextSortOrder(Site)
    });
    res.status(201).json(site);
  } catch (error) {
    next(error);
  }
};

const updateSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid site id' });
    }
    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const { name, address, active, sortOrder } = req.body;
    const { value: location, error } = parseSiteLocation(req.body.location);
    if (error) return res.status(400).json({ message: error });

    if (name !== undefined) site.name = name;
    if (address !== undefined) site.address = address;
    if (location !== undefined) site.location = location || undefined;
    if (typeof active === 'boolean') site.active = active;
    if (Number.isFinite(sortOrder)) site.sortOrder = sortOrder;

    await site.save();
    res.json(site);
  } catch (error) {
    next(error);
  }
};

// --- Tasks and issue flags ---

const listOptions = async (req, res, next) => {
  try {
    await ReportOption.ensureDefaultIssues();
    res.json(await ReportOption.find().sort({ type: 1, sortOrder: 1, label: 1 }));
  } catch (error) {
    next(error);
  }
};

const createOption = async (req, res, next) => {
  try {
    const { type, label } = req.body;
    if (!['task', 'issue'].includes(type)) {
      return res.status(400).json({ message: 'type must be task or issue' });
    }
    const option = await ReportOption.create({
      type,
      label,
      sortOrder: await nextSortOrder(ReportOption, { type })
    });
    res.status(201).json(option);
  } catch (error) {
    next(error);
  }
};

const updateOption = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid option id' });
    }
    const option = await ReportOption.findById(id);
    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    const { label, active, sortOrder } = req.body;
    if (label !== undefined) option.label = label;
    if (typeof active === 'boolean') option.active = active;
    if (Number.isFinite(sortOrder)) option.sortOrder = sortOrder;

    await option.save();
    res.json(option);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSites,
  createSite,
  updateSite,
  listOptions,
  createOption,
  updateOption
};
