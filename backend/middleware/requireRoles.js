const User = require('../models/user/User')
const { CustomError } = require('./errorHandler')

const requireRoles = (Roles) => {
    return (req, res, next) => {
        const checkRoles = req.roles.find(role => Roles.includes(role))
        if(!checkRoles) throw new CustomError('Unauthorized Roles', 401)
        next()
    }
}

module.exports = requireRoles