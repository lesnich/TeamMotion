const ChallengeProgress = require('../models/ChallengeProgress');
const User = require('../models/user/User');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');
const ROLES_LIST = require('../config/rolesList');

// 📤 GET ALL
exports.getAll = async (req, res, next) => {
  try {
    const { challenge_id } = req.query;
    const filters = {};

    if (challenge_id) {
      validateObjectId(challenge_id, 'Challenge');
      filters.challenge_id = challenge_id;
    }

    if (req.roles.includes(ROLES_LIST.User) || req.roles.includes(ROLES_LIST.Admin)) {
      if (!req.user.company) throw new CustomError('User has no company', 403);
      const users = await User.find({ company: req.user.company }).select('_id').lean();
      filters.user_id = { $in: users.map(u => u._id) };
    }

    const progress = await ChallengeProgress.find(filters).lean();
    res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
};

// 📘 GET ONE
exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'ChallengeProgress');

    const progress = await ChallengeProgress.findById(id).lean();
    if (!progress) throw new CustomError('Progress not found', 404);

    if (req.roles.includes(ROLES_LIST.Root)) return res.status(200).json(progress);

    const targetUser = await User.findById(progress.user_id).select('company').lean();
    if (!targetUser) throw new CustomError('User not found', 404);

    if (!req.user.company || req.user.company.toString() !== targetUser.company?.toString()) {
      throw new CustomError('Not authorized to view this progress', 403);
    }

    res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
};

// 🆕 CREATE
exports.create = async (req, res, next) => {
  try {
    const { challenge_id, value } = req.body;

    if (!challenge_id) throw new CustomError('Challenge ID is required', 400);
    validateObjectId(challenge_id, 'Challenge');

    const existing = await ChallengeProgress.findOne({
      challenge_id,
      user_id: req.user._id
    });

    if (existing) throw new CustomError('Progress already exists', 409);

    const progress = await ChallengeProgress.create({
      challenge_id,
      user_id: req.user._id,
      value: value || 0
    });

    res.status(201).json(progress);
  } catch (error) {
    next(error);
  }
};

// ✏️ UPDATE
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'ChallengeProgress');

    const progress = await ChallengeProgress.findById(id);
    if (!progress) throw new CustomError('Progress not found', 404);

    if (req.roles.includes(ROLES_LIST.Root)) {
      Object.assign(progress, req.body);
      await progress.save();
      return res.status(200).json(progress);
    }

    const targetUser = await User.findById(progress.user_id).select('company').lean();
    if (!targetUser) throw new CustomError('User not found', 404);

    if (
      req.roles.includes(ROLES_LIST.Admin) &&
      req.user.company?.toString() === targetUser.company?.toString()
    ) {
      Object.assign(progress, req.body);
      await progress.save();
      return res.status(200).json(progress);
    }

    if (
      req.roles.includes(ROLES_LIST.User) &&
      progress.user_id.toString() === req.user._id.toString()
    ) {
      Object.assign(progress, req.body);
      await progress.save();
      return res.status(200).json(progress);
    }

    throw new CustomError('Not authorized to update this progress', 403);
  } catch (error) {
    next(error);
  }
};

// 🗑 DELETE
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateObjectId(id, 'ChallengeProgress');

    const progress = await ChallengeProgress.findById(id);
    if (!progress) throw new CustomError('Progress not found', 404);

    if (
      req.roles.includes(ROLES_LIST.Root) ||
      (req.roles.includes(ROLES_LIST.User) && progress.user_id.toString() === req.user._id.toString())
    ) {
      await ChallengeProgress.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Progress deleted', id });
    }

    throw new CustomError('Not authorized to delete this progress', 403);
  } catch (error) {
    next(error);
  }
};
