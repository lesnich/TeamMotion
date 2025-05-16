const { logEvents } = require('./logger')

class CustomError extends Error {
    constructor(message, statusCode, resetPasswordError) {
        super(message)
        this.statusCode  = statusCode 
        this.resetPasswordError = resetPasswordError
    }
}

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
}

const errorHandler = (err, req, res, next) => {
    // logEvents(`${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log')
    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    const resetPasswordError = err.resetPasswordError || {}

    return res.status(statusCode).json({ 
        error: message, 
        ...resetPasswordError,
        stack: process.env.NODE_ENV === 'production' ? null :  err.stack 
    })
}

module.exports = { CustomError, errorHandler, notFound } 