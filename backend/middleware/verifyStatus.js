const validator = require('validator')
const { verificationStatus } = require('../controllers/auth')
const { CustomError } = require('./errorHandler')

const validateEmail = (email) => {
    const isEmailEmpty = validator.isEmpty(email ?? '', { ignore_whitespace:true })
    if (isEmailEmpty) throw new CustomError('Email Address Require', 400)

    if (!validator.isEmail(email)) throw new CustomError('Email not valid', 400)
    
    return email
}

exports.emailVerifiedStatus = (req, res, next) => {
    const { email } = req.body

    const verifiedEmail = validateEmail(email)

    if (!verificationStatus[verifiedEmail] || !verificationStatus[verifiedEmail].emailVerified) return res.status(401).json({ error: "Your account has been blocked. For security reasons, the page will redirect to a 404 page soon.", otpVerified: false })
    
    req.email = verifiedEmail

    next()
}

exports.otpVerifiedtatus = (req, res, next) => {
    const { email } = req.body

    const verifiedEmail = validateEmail(email)

    if (!verificationStatus[verifiedEmail] || !verificationStatus[verifiedEmail].otpVerified) return res.status(401).json({ error: "Your account has been blocked. For security reasons, the page will redirect to a 404 page soon.", passwordUpdated: false })

    req.email = verifiedEmail

    next()
}
