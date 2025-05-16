const sleepRouter = require('express').Router()
const Sleep = require('../models/Sleep')
const requireAuth = require('../middleware/requireAuth')

sleepRouter.use(requireAuth)

// GET all sleep records
sleepRouter.get('/', async (req, res) => {
    const sleeps = await Sleep.find({ user_id: req.user }).sort({ sleepStart: -1 })
    res.status(200).json(sleeps)
})

// POST new sleep record
sleepRouter.post('/', async (req, res) => {
    const newSleep = await Sleep.create({ ...req.body, user_id: req.user })
    res.status(201).json(newSleep)
})

module.exports = sleepRouter
