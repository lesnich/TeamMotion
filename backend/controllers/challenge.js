const Challenge = require('../models/Challenge');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');
const ROLES_LIST = require('../config/rolesList');

exports.create = async (req, res, next) => {
    try {
        const { name, description, startDate, endDate, type, mode } = req.body;

        if (!name || !startDate || !endDate || !type) {
            throw new CustomError('Required fields are missing', 400);
        }

        const challenge = await Challenge.create({
            name: name.trim(),
            description: description?.trim() || '',
            startDate,
            endDate,
            type,
            mode: mode || 'individual',
            createdBy: req.user._id,
            company: req.user.company // 🔗 прив’язка до компанії
        });


        res.status(201).json(challenge);
    } catch (error) {
        next(error);
    }
};

exports.getAll = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;

        const filters = {};

        // 🔐 User/Admin/Root — бачать лише челенджі своєї компанії
        if (req.user.company) {
            filters.company = req.user.company;
        } else {
            throw new CustomError('Company not defined for user', 403);
        }

        if (status) filters.status = status;
        if (type) filters.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Challenge.countDocuments(filters);

        const challenges = await Challenge.find(filters)
            .sort({ startDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean()
            .exec();

        res.status(200).json({
            page: parseInt(page),
            total,
            totalPages: Math.ceil(total / limit),
            challenges
        });
    } catch (error) {
        next(error);
    }
};


exports.getOne = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Challenge');

        const challenge = await Challenge.findById(id).lean().exec();
        if (!challenge) throw new CustomError('Challenge not found', 404);

        // 🔐 Admin може бачити тільки свої челенджі
        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            challenge.createdBy.toString() !== req.user._id.toString()
        ) {
            throw new CustomError('Not authorized to view this challenge', 403);
        }

        res.status(200).json(challenge);
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Challenge');

        const challenge = await Challenge.findById(id).lean();
        if (!challenge) throw new CustomError('Challenge not found', 404);

        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            challenge.createdBy.toString() !== req.user._id.toString()
        ) {
            throw new CustomError('Not authorized to edit this challenge', 403);
        }

        const updated = await Challenge.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        }).lean().exec();

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Challenge');

        const challenge = await Challenge.findById(id).lean();
        if (!challenge) throw new CustomError('Challenge not found', 404);

        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            challenge.createdBy.toString() !== req.user._id.toString()
        ) {
            throw new CustomError('Not authorized to delete this challenge', 403);
        }

        await Challenge.findByIdAndDelete(id);
        res.status(200).json({ message: 'Challenge deleted', id });
    } catch (error) {
        next(error);
    }
};
