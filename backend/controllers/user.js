const bcrypt = require('bcrypt')
const User = require('../models/user/User')
const ROLES_LIST = require('../config/rolesList')
const { CustomError } = require('../middleware/errorHandler')
const { validateAuthInputField, validateObjectId } = require('../utils/validation')

exports.getAll = async (req, res, next) => {
    try {
        const query = req.roles.includes(ROLES_LIST.Root) ? {} : { $or: [{ roles: ROLES_LIST.User }, { _id: req.user._id }], roles: { $ne: ROLES_LIST.Root }}
        const users = await User.find(query).sort({ isOnline: -1, lastActive: -1 }).select('-password -otp').lean().exec()
        if (!users?.length) throw new CustomError('No users found', 404)
        
        res.status(200).json(users)
    } catch (error) {
        next(error)
    }
}

exports.create = async (req, res, next) => {
    try {
        const { name, email, password, roles, active } = req.body

        validateAuthInputField({ name, email, password })

        if(roles){if (!Array.isArray(roles) || !roles.length) throw new CustomError('Invalid roles data type received', 400)}
        if(active){if(typeof active !== 'boolean') throw new CustomError('Invalid active data type received', 400)}
    
        const duplicateEmail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()
        if(duplicateEmail) throw new CustomError('Email already in use', 409)
    
        const hashedPassword  = await bcrypt.hash(password, 10)
        
        if(roles.includes(ROLES_LIST.Admin) && req.roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to create admin', 401)
    
        const createUser = { name: name.trim(), email: email.trim(), password: { hashed: hashedPassword }, roles: roles ?? [ROLES_LIST.User], active: active ?? true}
        
        const user = await User.create(createUser)
        if(!user) throw new CustomError('Invalid user data received', 400)
    
        res.status(201).json({ _id: user._id, name: user.name, email: user.email, roles: user.roles, active: user.active, isOnline: user.isOnline, lastActive: user.lastActive})
    } catch (error) {
        next(error)
    }
}

exports.update = async (req, res, next) => {
    try {
        const { id, name, email, password, roles, active } = req.body
    
        validateObjectId(id, 'User')
        
        const checkUser = await User.findById(id).exec()
        if (!checkUser) throw new CustomError('User not found', 400)
    
        const updateFields = {}
    
        if(name) { 
            validateAuthInputField({ name })
            updateFields.name = name 
        }
    
        if(email){
            validateAuthInputField({ email })
            const duplicateEmail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()
            if (duplicateEmail && duplicateEmail?._id.toString() !== id) throw new CustomError('Email already in use', 409)
            updateFields.email = email
        }
    
        if(password){
            validateAuthInputField({ password })
            updateFields.password = { hashed: await bcrypt.hash(password, 10), errorCount: 0}
        }
    
        if(roles){
            if (!Array.isArray(roles) || !roles.length) throw new CustomError('Invalid roles data type received', 400)
            updateFields.roles = roles
        }

        if (typeof active === 'boolean') {
            updateFields.active = active
            if (active) {
                Object.assign(updateFields, { 
                    password: { hashed: checkUser.password.hashed, errorCount: 0 },
                    otp: { requests: 0, errorCount: 0 }
                })
            } else {
                updateFields.isOnline = false
            }
        }
        
        const verifyRole = await User.findById(id).lean().exec()
        if(verifyRole.roles.includes(ROLES_LIST.Root)) throw new CustomError('Not authorized to edit root user', 401)
        if(req.roles.includes(ROLES_LIST.Admin) && verifyRole.roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to edit this admin', 401)

        const updatedUser = await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true }).lean().exec()
        if (!updatedUser) throw new CustomError( 'User not found, something went wrong, during update', 404)

        const query = req.roles.includes(ROLES_LIST.Root) ? {} : { $or: [{ roles: ROLES_LIST.User }, { _id: req.user._id }], roles: { $ne: ROLES_LIST.Root }}
        const users = await User.find(query).sort({ isOnline: -1, lastActive: -1 }).select('-password -otp').lean().exec()
        
        res.status(200).json(users)
    } catch (error) {
        next(error)
    }
}

exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params

        validateObjectId(id, 'User')
    
        const verifyRole = await User.findById(id).lean().exec()
        if(verifyRole.roles.includes(ROLES_LIST.Root)) throw new CustomError('Not authorized to delete root user', 401)
        if(req.roles.includes(ROLES_LIST.Admin) && verifyRole.roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to delete this admin', 401)
        
        const user = await User.findByIdAndDelete(id).lean().exec()
        if (!user) throw new CustomError(400).json('User not found', 404)
    
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}