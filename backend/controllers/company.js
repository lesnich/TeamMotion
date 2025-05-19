const Company = require('../models/Company');
const { CustomError } = require('../middleware/errorHandler');
const { validateObjectId } = require('../utils/validation');
const ROLES_LIST = require('../config/rolesList');
const User = require('../models/user/User'); // додай, якщо ще нема

exports.getUsersOfCompany = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, sortBy = 'name', order = 'asc', role } = req.query;

        validateObjectId(id, 'Company');

        // 🔐 Admin може тільки свою компанію
        if (req.roles.includes(ROLES_LIST.Admin)) {
            if (!req.user.company || req.user.company.toString() !== id.toString()) {
                throw new CustomError('Not authorized to view this company\'s users', 403);
            }
        }

        const filters = { company: id };
        if (role) filters.roles = role;

        const allowedSortFields = ['name', 'email', 'lastActive'];
        if (!allowedSortFields.includes(sortBy)) {
            throw new CustomError('Invalid sort field', 400);
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(filters);

        const users = await User.find(filters)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-password -otp')
            .lean()
            .exec();

        res.status(200).json({
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            users
        });
    } catch (error) {
        next(error);
    }
};


exports.create = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name?.trim()) throw new CustomError('Company name is required', 400);

        const duplicate = await Company.findOne({ name: name.trim() }).lean().exec();
        if (duplicate) throw new CustomError('Company already exists', 409);

        const company = await Company.create({ name: name.trim(), description: description?.trim() || '' });
        res.status(201).json(company);
    } catch (error) {
        next(error);
    }
};

exports.getAll = async (req, res, next) => {
    try {
        const { name, sortBy = 'name', order = 'asc', page = 1, limit = 10 } = req.query;

        const filters = {};
        if (name) {
            filters.name = { $regex: name, $options: 'i' };
        }

        const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
        if (!allowedSortFields.includes(sortBy)) {
            throw new CustomError('Invalid sort field', 400);
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Company.countDocuments(filters);

        const companies = await Company.find(filters)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean()
            .exec();

        res.status(200).json({
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            companies
        });
    } catch (error) {
        next(error);
    }
};

exports.getOne = async (req, res, next) => {
    try {
        const { id } = req.params;
        validateObjectId(id, 'Company');

        const company = await Company.findById(id).lean().exec();
        if (!company) throw new CustomError('Company not found', 404);

        res.status(200).json(company);
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { id, name, description } = req.body;

        validateObjectId(id, 'Company');
        if (!name?.trim()) throw new CustomError('Company name is required', 400);

        // 🔒 Перевірка: Admin може редагувати лише свою компанію
        if (req.roles.includes(ROLES_LIST.Admin)) {
            // якщо адмін не привʼязаний до жодної компанії або ID не збігається
            if (!req.user.company || req.user.company.toString() !== id.toString()) {
                throw new CustomError('Not authorized to edit this company', 403);
            }
        }

        const duplicate = await Company.findOne({ name: name.trim(), _id: { $ne: id } }).lean().exec();
        if (duplicate) throw new CustomError('Another company with this name already exists', 409);

        const updated = await Company.findByIdAndUpdate(
            id,
            { name: name.trim(), description: description?.trim() || '' },
            { new: true, runValidators: true }
        ).lean().exec();

        if (!updated) throw new CustomError('Company not found', 404);

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};



exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;

        validateObjectId(id, 'Company');

        const deleted = await Company.findByIdAndDelete(id).lean().exec();
        if (!deleted) throw new CustomError('Company not found', 404);

        res.status(200).json({ message: 'Company deleted', id });
    } catch (error) {
        next(error);
    }
};



