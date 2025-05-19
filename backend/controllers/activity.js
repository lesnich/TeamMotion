const Activity = require('../models/Activity');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');

exports.create = async (req, res, next) => {
    try {
        const {
            user_id,
            date,
            steps,
            calories,
            distance,
            heartRateAvg,
            minutesActive,
            elevationGain,
            hydration,
            cyclingDistance,
            source
        } = req.body;

        if (!user_id || !date) throw new CustomError('user_id and date are required', 400);
        validateObjectId(user_id, 'User');

        const activity = await Activity.create({
            user_id,
            date,
            steps,
            calories,
            distance,
            heartRateAvg,
            minutesActive,
            elevationGain,
            hydration,
            cyclingDistance,
            source
        });

        res.status(201).json(activity);
    } catch (error) {
        next(error);
    }
};

exports.getAll = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            source,
            page = 1,
            limit = 10
        } = req.query;

        const filters = {};

        // 🔐 Якщо роль User — фіксуємо user_id
        if (req.roles.includes(ROLES_LIST.User)) {
            filters.user_id = req.user._id;
        } else if (req.query.user_id) {
            // 🔐 Root/Admin можуть фільтрувати за user_id
            validateObjectId(req.query.user_id, 'User');
            filters.user_id = req.query.user_id;
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
            .lean()
            .exec();

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


exports.getOne = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const activity = await Activity.findById(id).lean().exec();
        if (!activity) throw new CustomError('Activity not found', 404);

        res.status(200).json(activity);
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const updated = await Activity.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        }).lean().exec();

        if (!updated) throw new CustomError('Activity not found', 404);

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Activity');

        const deleted = await Activity.findByIdAndDelete(id).lean().exec();
        if (!deleted) throw new CustomError('Activity not found', 404);

        res.status(200).json({ message: 'Activity deleted', id });
    } catch (error) {
        next(error);
    }
};
