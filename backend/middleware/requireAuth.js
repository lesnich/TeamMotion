const jwt = require('jsonwebtoken')
const User = require('../models/user/User')
const { CustomError } = require('./errorHandler')

const requireAuth = async (req, res, next) => {
  try {
    const { authorization } = req.headers
  
    if (!authorization || !authorization.startsWith('Bearer ')) throw new CustomError('Request is not authorized', 401)
  
    const accessToken = authorization.split(' ')[1]

    let decoded

    try {
      decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new CustomError('Forbidden token expired', 403)
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Invalid token', 403)
      } else {
        throw new CustomError('Token verification failed', 403)
      }
    }

    const checkActive = await User.findOne({ _id: decoded.userInfo._id }).select('_id active roles').lean().exec()
    if (!checkActive) throw new CustomError('Unauthorized user not found', 401)

    if(!checkActive.active){
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
      throw new CustomError('Your account has been blocked', 400)
    }

    req.user = checkActive._id
    req.roles = checkActive.roles

    if (!req.user._id) throw new CustomError('Unauthorized User ID', 401)
    if(!req.roles) throw new CustomError('Unauthorized Roles', 401)

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = requireAuth