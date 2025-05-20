const Activity = require('../models/Activity');
const User = require('../models/user/User');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');
const ROLES_LIST = require('../config/rolesList');

// 🆕 CREATE
exports.create = async (req, res, next) => {
    try {
        const { date, ...data } = req.body;

        if (!date) throw new CustomError('Date is required', 400);

        const activity = await Activity.create({
            ...data,
            user_id: req.user._id,
            date
        });

        res.status(201).json(activity);
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
            const usersInCompany = await User.find({ company: req.user.company }).select('_id').lean();
            filters.user_id = { $in: usersInCompany.map((u) => u._id) };
        }

        if (source) filters.source = source;
        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Activity.countDocuments(filters);

        const activities = await Activity.find(filters)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            activities
        });
    } catch (error) {
        next(error);
    }
};

// 📄 GET ONE
exports.getOne = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const activity = await Activity.findById(id).lean();
        if (!activity) throw new CustomError('Activity not found', 404);

        if (req.roles.includes(ROLES_LIST.Root)) return res.status(200).json(activity);

        const targetUser = await User.findById(activity.user_id).select('company').lean();
        if (!targetUser) throw new CustomError('User not found', 404);

        if (
            (req.roles.includes(ROLES_LIST.User) || req.roles.includes(ROLES_LIST.Admin)) &&
            (!req.user.company || req.user.company.toString() !== targetUser.company?.toString())
        ) {
            throw new CustomError('Not authorized to view this activity', 403);
        }

        if (
            req.roles.includes(ROLES_LIST.User) &&
            activity.user_id.toString() !== req.user._id.toString()
        ) {
            throw new CustomError('Not authorized to view this activity', 403);
        }

        res.status(200).json(activity);
    } catch (error) {
        next(error);
    }
};

// ✏️ UPDATE
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const activity = await Activity.findById(id);
        if (!activity) throw new CustomError('Activity not found', 404);

        if (req.roles.includes(ROLES_LIST.Root)) {
            Object.assign(activity, req.body);
            await activity.save();
            return res.status(200).json(activity);
        }

        const targetUser = await User.findById(activity.user_id).select('company').lean();
        if (!targetUser) throw new CustomError('User not found', 404);

        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            req.user.company?.toString() === targetUser.company?.toString()
        ) {
            Object.assign(activity, req.body);
            await activity.save();
            return res.status(200).json(activity);
        }

        if (
            req.roles.includes(ROLES_LIST.User) &&
            activity.user_id.toString() === req.user._id.toString()
        ) {
            Object.assign(activity, req.body);
            await activity.save();
            return res.status(200).json(activity);
        }

        throw new CustomError('Not authorized to update this activity', 403);
    } catch (error) {
        next(error);
    }
};

// ❌ DELETE
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const activity = await Activity.findById(id);
        if (!activity) throw new CustomError('Activity not found', 404);

        if (req.roles.includes(ROLES_LIST.Root)) {
            await Activity.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Activity deleted', id });
        }

        const targetUser = await User.findById(activity.user_id).select('company').lean();
        if (!targetUser) throw new CustomError('User not found', 404);

        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            req.user.company?.toString() === targetUser.company?.toString()
        ) {
            await Activity.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Activity deleted', id });
        }

        if (
            req.roles.includes(ROLES_LIST.User) &&
            activity.user_id.toString() === req.user._id.toString()
        ) {
            await Activity.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Activity deleted', id });
        }

        throw new CustomError('Not authorized to delete this activity', 403);
    } catch (error) {
        next(error);
    }
};
