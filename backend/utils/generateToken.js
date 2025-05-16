const jwt = require('jsonwebtoken')

exports.generateAccessToken = (userInfo) => jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })

exports.generateRefreshToken = (_id) => jwt.sign({_id}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

exports.generateOTPToken = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const payload = { email, otp }
  const token = jwt.sign(payload, process.env.OTP_TOKEN_SECRET, { expiresIn: '5m' })
  return { otp, token }
}