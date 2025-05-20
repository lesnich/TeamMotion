const Sleep = require('../models/Sleep');
const User = require('../models/user/User');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');
const ROLES_LIST = require('../config/rolesList');

// 🆕 CREATE
exports.create = async (req, res, next) => {
  try {
    const { sleepStart, sleepEnd, ...rest } = req.body;
    if (!sleepStart || !sleepEnd) throw new CustomError('Sleep start and end required', 400);

    const sleep = await Sleep.create({
      user_id: req.user._id,
      sleepStart,
      sleepEnd,
      ...rest
    });

    res.status(201).json(sleep);
  } catch (error) {
    next(error);
  }
};

// 📋 GET ALL
exports.getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, source, page = 1, limit = 10 } = req.query;
    const filters = {};

    if (req.roles.includes(ROLES_LIST.User) || req.roles.includes(ROLES_LIST.Admin)) {
      if (!req.user.company) throw new CustomError('User has no company', 403);
      const users = await User.find({ company: req.user.company }).select('_id').lean();
      filters.user_id = { $in: users.map(u => u._id) };
    }

    if (source) filters.source = source;
    if (startDate || endDate) {
      filters.sleepStart = {};
      if (startDate) filters.sleepStart.$gte = new Date(startDate);
      if (endDate) filters.sleepStart.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sleep.countDocuments(filters);

    const records = await Sleep.find(filters)
        .sort({ sleepStart: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      records
    });
  } catch (error) {
    next(error);
  }
};

// 📘 GET ONE
exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'Sleep');

    const record = await Sleep.findById(id).lean();
    if (!record) throw new CustomError('Record not found', 404);

    if (req.roles.includes(ROLES_LIST.Root)) return res.status(200).json(record);

    const user = await User.findById(record.user_id).select('company').lean();
    if (!user) throw new CustomError('User not found', 404);

    if (!req.user.company || req.user.company.toString() !== user.company?.toString()) {
      throw new CustomError('Not authorized to view this record', 403);
    }

    if (
        req.roles.includes(ROLES_LIST.User) &&
        record.user_id.toString() !== req.user._id.toString()
    ) {
      throw new CustomError('Not authorized to view this record', 403);
    }

    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};

// ✏️ UPDATE
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'Sleep');

    const record = await Sleep.findById(id);
    if (!record) throw new CustomError('Record not found', 404);

    if (req.roles.includes(ROLES_LIST.Root)) {
      Object.assign(record, req.body);
      await record.save();
      return res.status(200).json(record);
    }

    const user = await User.findById(record.user_id).select('company').lean();
    if (!user) throw new CustomError('User not found', 404);

    if (
        req.roles.includes(ROLES_LIST.Admin) &&
        req.user.company?.toString() === user.company?.toString()
    ) {
      Object.assign(record, req.body);
      await record.save();
      return res.status(200).json(record);
    }

    if (
        req.roles.includes(ROLES_LIST.User) &&
        record.user_id.toString() === req.user._id.toString()
    ) {
      Object.assign(record, req.body);
      await record.save();
      return res.status(200).json(record);
    }

    throw new CustomError('Not authorized to update this record', 403);
  } catch (error) {
    next(error);
  }
};

// 🗑 DELETE
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'Sleep');

    const record = await Sleep.findById(id);
    if (!record) throw new CustomError('Record not found', 404);

    if (
        req.roles.includes(ROLES_LIST.Root) ||
        (req.roles.includes(ROLES_LIST.Admin) &&
            record.user_id &&
            (await User.findById(record.user_id).select('company').lean())?.company?.toString() === req.user.company?.toString()) ||
        (req.roles.includes(ROLES_LIST.User) && record.user_id.toString() === req.user._id.toString())
    ) {
      await Sleep.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Record deleted', id });
    }

    throw new CustomError('Not authorized to delete this record', 403);
  } catch (error) {
    next(error);
  }
};
