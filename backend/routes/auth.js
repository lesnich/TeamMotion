const router = require('express').Router()
const passport = require('passport')
const authController = require('../controllers/auth')
const loginLimiter = require('../middleware/loginLimiter')
const verifyStatus = require('../middleware/verifyStatus')
const { handlePersist, handleAuthFailure} = require('../middleware/googleAuth')

// Oauth2.0 Google
router.get('/google', handlePersist)
router.get('/google/callback', handleAuthFailure, authController.googleLogin)

router.post('/login', loginLimiter, authController.login)
router.post('/signup', loginLimiter, authController.signup)
router.post('/activate', authController.activate)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)

//Reset password
router.use(loginLimiter)
router.post('/verify-email', authController.verifyEmail)
router.post('/verify-OTP', verifyStatus.emailVerifiedStatus, authController.verifyOTP)
router.post('/rest-password', verifyStatus.emailVerifiedStatus, verifyStatus.otpVerifiedtatus, authController.restPassword)

module.exports = router