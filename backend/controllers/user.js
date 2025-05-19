const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/user/User');
const ROLES_LIST = require('../config/rolesList');
const { CustomError } = require('../middleware/errorHandler');
const { validateAuthInputField, validateObjectId } = require('../utils/validation');

exports.updateSelf = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const updateFields = {};
        const id = req.user._id;

        if (name) {
            validateAuthInputField({ name });
            updateFields.name = name;
        }

        if (email) {
            validateAuthInputField({ email });

            const duplicateEmail = await User.findOne({ email })
                .collation({ locale: 'en', strength: 2 })
                .lean()
                .exec();

            if (duplicateEmail && duplicateEmail._id.toString() !== id.toString()) {
                throw new CustomError('Email already in use', 409);
            }

            updateFields.email = email;
        }

        if (password) {
            validateAuthInputField({ password });
            updateFields.password = {
                hashed: await bcrypt.hash(password, 10),
                errorCount: 0
            };
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        )
            .select('-password -otp')
            .lean()
            .exec();

        if (!updatedUser) {
            throw new CustomError('User not found', 404);
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};


exports.getCurrent = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -otp')
            .lean()
            .exec();

        if (!user) throw new CustomError('User not found', 404);

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};


exports.getAll = async (req, res, next) => {
    try {
        const {
            role,
            email,
            company,
            active,
            sortBy = 'isOnline',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const filters = {};

        // Фільтрація
        if (role) filters.roles = role;
        if (email) filters.email = { $regex: email, $options: 'i' };
        if (company) filters.company = company;
        if (active !== undefined) filters.active = active === 'true';

        // Валідація сортування
        const allowedSortFields = ['name', 'email', 'lastActive', 'isOnline', 'roles'];
        if (!allowedSortFields.includes(sortBy)) {
            throw new CustomError('Invalid sort field', 400);
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        // Пагінація
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Доступна видимість
        const baseQuery = req.roles.includes(ROLES_LIST.Root)
            ? filters
            : {
                ...filters,
                $or: [{ roles: ROLES_LIST.User }, { _id: req.user._id }],
                roles: { $ne: ROLES_LIST.Root }
            };

        // Загальна кількість для pagination info
        const total = await User.countDocuments(baseQuery);

        const users = await User.find(baseQuery)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .select('-password -otp')
            .lean()
            .exec();

        if (!users?.length) throw new CustomError('No users found', 404);

        res.status(200).json({
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            users
        });
    } catch (error) {
        next(error);
    }
};




exports.getOne = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.status(200).json(user);
};

exports.create = async (req, res, next) => {
    try {
        const { name, email, password, roles, active, company, department, team } = req.body;

        validateAuthInputField({ name, email, password });

        if (roles && (!Array.isArray(roles) || !roles.length)) {
            throw new CustomError('Invalid roles data type received', 400);
        }

        if (active !== undefined && typeof active !== 'boolean') {
            throw new CustomError('Invalid active data type received', 400);
        }

        const duplicateEmail = await User.findOne({ email })
            .collation({ locale: 'en', strength: 2 })
            .lean()
            .exec();
        if (duplicateEmail) throw new CustomError('Email already in use', 409);

        const hashedPassword = await bcrypt.hash(password, 10);

        if (roles?.includes(ROLES_LIST.Admin) && req.roles.includes(ROLES_LIST.Admin)) {
            throw new CustomError('Not authorized to create admin', 401);
        }

        const newUser = {
            name: name.trim(),
            email: email.trim(),
            password: { hashed: hashedPassword },
            roles: roles ?? [ROLES_LIST.User],
            active: active ?? true
        };

        if (company) {
            validateObjectId(company, 'Company');
            newUser.company = company;
        }

        if (department) {
            validateObjectId(department, 'Department');
            newUser.department = department;
        }

        if (team) {
            validateObjectId(team, 'Team');
            newUser.team = team;
        }

        const user = await User.create(newUser);
        if (!user) throw new CustomError('Invalid user data received', 400);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            active: user.active,
            company: user.company,
            department: user.department,
            team: user.team,
            isOnline: user.isOnline,
            lastActive: user.lastActive
        });
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { id, name, email, password, roles, active, company, department, team } = req.body;

        validateObjectId(id, 'User');

        const checkUser = await User.findById(id).exec();
        if (!checkUser) throw new CustomError('User not found', 400);

        const updateFields = {};

        if (name) {
            validateAuthInputField({ name });
            updateFields.name = name;
        }

        if (email) {
            validateAuthInputField({ email });

            const duplicateEmail = await User.findOne({ email })
                .collation({ locale: 'en', strength: 2 })
                .lean()
                .exec();

            if (duplicateEmail && duplicateEmail._id.toString() !== id) {
                throw new CustomError('Email already in use', 409);
            }

            updateFields.email = email;
        }

        if (password) {
            validateAuthInputField({ password });
            updateFields.password = {
                hashed: await bcrypt.hash(password, 10),
                errorCount: 0
            };
        }

        if (roles) {
            if (!Array.isArray(roles) || !roles.length) {
                throw new CustomError('Invalid roles data type received', 400);
            }
            updateFields.roles = roles;
        }

        if (typeof active === 'boolean') {
            updateFields.active = active;

            if (active) {
                Object.assign(updateFields, {
                    password: {
                        hashed: checkUser.password.hashed,
                        errorCount: 0
                    },
                    otp: { requests: 0, errorCount: 0 }
                });
            } else {
                updateFields.isOnline = false;
            }
        }

        if (company) {
            validateObjectId(company, 'Company');
            updateFields.company = company;
        }

        if (department) {
            validateObjectId(department, 'Department');
            updateFields.department = department;
        }

        if (team) {
            validateObjectId(team, 'Team');
            updateFields.team = team;
        }

        const verifyRole = await User.findById(id).lean().exec();
        if (verifyRole.roles.includes(ROLES_LIST.Root)) {
            throw new CustomError('Not authorized to edit root user', 401);
        }

        if (
            req.roles.includes(ROLES_LIST.Admin) &&
            verifyRole.roles.includes(ROLES_LIST.Admin) &&
            req.user._id.toString() !== id
        ) {
            throw new CustomError('Not authorized to edit this admin', 401);
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        )
            .select('-password -otp')
            .lean()
            .exec();

        if (!updatedUser) {
            throw new CustomError('User not found, something went wrong during update', 404);
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};


exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;

        validateObjectId(id, 'User');

        const verifyRole = await User.findById(id).lean().exec();
        if (verifyRole.roles.includes(ROLES_LIST.Root)) {
            throw new CustomError('Not authorized to delete root user', 401);
        }
        if (req.roles.includes(ROLES_LIST.Admin) && verifyRole.roles.includes(ROLES_LIST.Admin)) {
            throw new CustomError('Not authorized to delete this admin', 401);
        }

        const user = await User.findByIdAndDelete(id).lean().exec();
        if (!user) throw new CustomError('User not found', 404);

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};
