const passport = require('passport')
const User = require('../models/user/User')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const jwt = require('jsonwebtoken')
const { generateAccessToken } = require('../utils/generateToken')

const passportSetup =  () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile
    const email = emails[0].value
  
    try {
      let user = await User.findOne({ email }).exec()
      if (user && !user.active) return done(null, false, { message: 'Your account has been temporarily blocked. Please reach out to our Technical Support team for further assistance.' })
  
      if (user) {
        if (!user.googleId) {
          user.googleId = id
          await user.save()
        }
      } else {
        user = await User.create({ googleId: id, name: displayName, email })
      }
  
      const accessToken = generateAccessToken({userInfo: {_id: user._id, name: user.name, email: user.email, roles: user.roles}})
  
      return done(null, { _id: user._id, accessToken })
    } catch (err) {
      return done(err, false)
    }
  }))
}

module.exports = passportSetup