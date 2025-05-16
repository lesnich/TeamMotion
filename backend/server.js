require('dotenv').config()
const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const mongoose = require('mongoose')
const helmet = require("helmet")
const cookieParser = require('cookie-parser')
const session = require('express-session')
const passport = require('passport')
const corsMiddleware = require('./config/corsOptions')
const { logger } = require('./middleware/logger')
const { errorHandler, notFound } = require('./middleware/errorHandler')
const connectDB = require('./config/dbConn')
const setupSocket = require('./middleware/onlineStatus')
const passportSetup = require('./config/passportSetup')
const requireAuth = require('./middleware/requireAuth')
const url = require('./config/url')

const port = process.env.PORT || 4000
const app = express()
const server = http.createServer(app)
const io = socketIo(server, { cors: { origin: url, methods: ['GET', 'POST' ] } })

connectDB()
passportSetup()

app.use(helmet())
app.use(corsMiddleware)

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cookieParser())

app.use(session({ 
  secret: process.env.SESSION_TOKEN_SECRET, 
  resave: false, 
  saveUninitialized: false, 
  cookie: { 
    secure: process.env.NODE_ENV === 'production' || false,
    sameSite: 'Lax',
    httpOnly: true 
  }
}))
app.use(passport.initialize())

app.use('/api/auth', require('./routes/auth'))

app.use(requireAuth)
setupSocket(io)

app.use('/api/users', require('./routes/user'))
app.use('/api/sleeps', require('./routes/sleep'))
app.use('/api/activities', require('./routes/activity'))
app.use('/api/challenges', require('./routes/challenge'))
app.use('/api/companies', require('./routes/company'))
// app.use(logger)
app.use(notFound)
app.use(errorHandler)

mongoose.connection.once('open', () => {
  console.log('Databse Connected Successful!')
  server.listen(port, () => console.log(`Server running on port ${port}`))
})