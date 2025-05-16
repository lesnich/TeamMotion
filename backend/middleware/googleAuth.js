const passport = require('passport')
const url = require('../config/url')

const handlePersist = (req, res, next) => {
  req.session.persist = req.query.persist
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
}

const handleAuthFailure = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      console.log(err)
      const message = info ? info.message : 'Authentication failed'
      return res.redirect(`${url}/error?message=${encodeURIComponent(message)}`)
    }

    req.logIn(user, { session: false }, (err) => {
      if (err) return res.redirect(`${url}/error?message=${encodeURIComponent('Login failed')}`)

      return next()
    })
  })(req, res, next)
}

module.exports = { handlePersist, handleAuthFailure}