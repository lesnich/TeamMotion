const jwt = require('jsonwebtoken')
const axios = require('axios')
const bcrypt = require('bcrypt')
const validator = require('validator')
const url = require('../config/url')
const User = require('../models/user/User')
const redisClient = require('../config/redisConn')
const activateMail= require('../utils/activateMail')
const resetPassword= require('../utils/resetPassword')
const { CustomError } = require('../middleware/errorHandler')
const { validateAuthInputField } = require('../utils/validation')
const { generateAccessToken, generateRefreshToken, generateOTPToken } = require('../utils/generateToken')

const verificationStatus = {}

exports.login = async (req, res, next) => {
  try {
    const { email, password, persist, token } = req.body
    // const reCaptchaRe = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`, {
    //   headers: {"Content-Type": "application/x-www-form-urlencoded"}
    // })
    //
    // if(!reCaptchaRe.data.success || reCaptchaRe.data.score <= 0.5) throw new CustomError('Google ReCaptcha Validation Failure', 403)
    //
    const user = await User.login(email, password)

    const accessToken = generateAccessToken({
      userInfo: {
        _id: user._id, 
        name: user.name, 
        email, 
        roles: user.roles
      }
    })
    
    if(persist){
      const refreshToken = generateRefreshToken(user._id)
      res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    }

    res.status(200).json(accessToken)
  } catch (error) {
    next(error)
  }
}

exports.googleLogin = (req, res, next) => {
  try {
    if(req.session.persist){
      const refreshToken = generateRefreshToken(req.user._id)
      res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
      delete req.session.persist
    }
    
    res.redirect(`${url}?token=${req.user.accessToken}`)
  } catch (error) {
    next(error)
  }
}

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, persist } = req.body

    validateAuthInputField({ name, email, password })
  
    const duplicateEmail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()
    if (duplicateEmail) throw new CustomError('Email already in use', 409)
  
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = { name: name.trim(), email: email.trim(), password: hashedPassword, persist }
    const activation_token = generateAccessToken(newUser)
    
    const activateUrl = `${url}/activate/${activation_token}`
    activateMail.activateMailAccount(email, activateUrl, 'Verify your email')

    res.status(200).json({ mailSent: true })
  } catch (error) {
    next(error)
  }
}

exports.activate = async (req, res, next) => {
  try {
    const { activation_token } = req.body
    if (!activation_token) throw new CustomError('Unauthorized activation token not found', 401)

    let decoded
  
    try {
      decoded = jwt.verify(activation_token, process.env.ACCESS_TOKEN_SECRET)
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new CustomError('Forbidden token expired', 403)
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Invalid token', 403)
      } else {
        throw new CustomError('Token verification failed', 403)
      }
    }

    const user = await User.signup(decoded.name, decoded.email, decoded.password)

    const accessToken = generateAccessToken({ 
      userInfo: {
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        roles: user.roles
      } 
    })

    if(decoded.persist){
      const refreshToken = generateRefreshToken(user._id)
      res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    }

    res.status(200).json(accessToken)
  } catch (error) {
    next(error)
  }
}

exports.refresh = async (req, res, next) => {
  try {
    if (!req.cookies.jwt) throw new CustomError('Unauthorized refresh token not found', 401)
    const refreshToken = req.cookies.jwt

    let decoded

    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
        throw new CustomError('Forbidden token expired', 403)
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
        throw new CustomError('Invalid token', 403)
      } else {
        throw new CustomError('Token verification failed', 403)
      }
    }

    const foundUser = await User.findOne({ _id: decoded._id }).lean().exec()
    if (!foundUser) throw new CustomError('Unauthorized user not found', 403)

    if(!foundUser.active){
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
      throw new CustomError('Your account has been blocked', 403)
    }

    const accessToken = generateAccessToken({
      userInfo: {
        _id: foundUser._id, 
        name: foundUser.name, 
        email: foundUser.email, 
        roles: foundUser.roles
      }
    })

    res.status(200).json(accessToken)
  } catch (error) {
    next(error)
  }
}

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies.jwt
    if (!token) return res.sendStatus(204)
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
    res.status(200).json({ error: 'Logout successful '})
  } catch (error) {
    next(error)
  }
}

exports.verifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body
    let isEmailVerified = false

    verificationStatus[email] = { emailVerified: isEmailVerified }

    validateAuthInputField({ email })
  
    const emailExist = await User.findOne({ email }).exec()
    if (!emailExist) throw new CustomError('Email Address Not Found', 400)
  
    if(!emailExist.active) throw new CustomError('Your account has been temporarily blocked. Please reach out to our Technical Support team for further assistance.', 403, { emailVerified: isEmailVerified })

    const now = new Date()
    const day = 24 * 60 * 60 * 1000

    if (emailExist.otp.requests >= 3 && emailExist.otp.requestDate && (now - emailExist.otp.requestDate) < day) {
      throw new CustomError('Too many OTP requests. Please try again tomorrow.', 429, { emailVerified: isEmailVerified })
    }

    if ((now - emailExist.otp?.requestDate) >= day) {
      await User.updateOne({ email }, {$set: { 'otp.requests': 0 }})
    }
  
    const { otp, token } = generateOTPToken(email)

    emailExist.otp.requests += 1
    emailExist.otp.requestDate = new Date()
    await emailExist.save()

    await redisClient.set(email, token, { EX: 300 })

    resetPassword.receiveOTP(email, otp)

    isEmailVerified = true
    verificationStatus[email].emailVerified = isEmailVerified
    res.status(200).json({ email, emailVerified: isEmailVerified })
  } catch (error) {
    next(error)
  }
}

exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body
    const email = req.email
    let isOtpVerified = false

    verificationStatus[email].otpVerified = isOtpVerified
    const otpToken = await redisClient.get(email)
    const isOtpEmpty = validator.isEmpty(otp ?? '', { ignore_whitespace:true })

    if (!otpToken || isOtpEmpty || otp.length < 6) throw new CustomError('Invalid OTP', 400)

    const emailExist = await User.findOne({ email }).exec()
    if(!emailExist || !emailExist.active) throw new CustomError('Your account has been blocked. Access has been prohibited for security reasons.', 403, { otpVerified: isOtpVerified })

    let decoded

    try {
      decoded = jwt.verify(otpToken, process.env.OTP_TOKEN_SECRET)
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new CustomError('Forbidden token expired', 403)
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Invalid token', 403)
      } else {
        throw new CustomError('Token verification failed', 403)
      }
    }

    if (!decoded || decoded.otp !== otp){
      const now = new Date()
      const day = 24 * 60 * 60 * 1000
  
      if (emailExist.otp.errorCount >= 3 && emailExist.otp.errorDate && (now - emailExist.otp.errorDate) < day) {
        await User.updateOne({ email }, {$set: { 'active': false }})
        throw new CustomError("You've tried too many times with an incorrect OTP, this account has been temporarily blocked for security reasons. Please reach out to our Technical Support team for further assistance.", 429, { otpVerified: isOtpVerified })
      }
  
      if ((now - emailExist.otp.errorDate) >= day) {
        await User.updateOne({ email }, {$set: { 'otp.errorCount': 0}})
      }
      
      if(!emailExist.active) throw new CustomError('Your account has been temporarily blocked. Please reach out to our Technical Support team for further assistance.', 403, { otpVerified: isOtpVerified })
      
      emailExist.otp.errorCount += 1
      emailExist.otp.errorDate = new Date()
      await emailExist.save()

      throw new CustomError('Invalid or expired OTP', 400, { otpVerified: isOtpVerified })
    }

    await redisClient.del(email)

    isOtpVerified = true
    verificationStatus[email].otpVerified = isOtpVerified

    res.status(200).json({ otpVerified: isOtpVerified })
  } catch (error) {
    next(error)
  }
}

exports.restPassword = async (req, res, next) => {
  try {
    const { password } = req.body
    const email = req.email
    let isPasswordUpdated = false

    validateAuthInputField({ password })
  
    const emailExist = await User.findOne({ email }).lean()
    if(!emailExist || !emailExist.active) throw new CustomError('Your account has been blocked. Access has been prohibited for security reasons.', 403, { passwordUpdated: isPasswordUpdated })
  
    const hashedPassword = await bcrypt.hash(password, 10)
    await User.updateOne({ email }, { $set: { 'password.hashed': hashedPassword } })

    delete verificationStatus[email]
    isPasswordUpdated = true
    res.status(200).json({ passwordUpdated: isPasswordUpdated })
  } catch (error) {
    next(error)
  }
}

exports.verificationStatus = verificationStatus