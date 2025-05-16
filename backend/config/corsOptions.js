const cors = require('cors')
const { allowedOrigins, paths } = require('./allowedOrigins')

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
}

const oauthCorsOptions = {
    origin: (origin, callback) => {
        callback(null, true)
    },
    methods: ['GET'],
    credentials: true,
    optionsSuccessStatus: 200
}

const corsMiddleware = (req, res, next) => {
    if (paths.includes(req.path)) {
        cors(oauthCorsOptions)(req, res, next)
    } else {
        cors(corsOptions)(req, res, next)
    }
}

module.exports = corsMiddleware