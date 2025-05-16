const challengeRouter = require('express').Router()
const Challenge = require('../models/Challenge')
const requireAuth = require('../middleware/requireAuth')
const requireRoles = require('../middleware/requireRoles')
const ROLES_LIST = require('../config/rolesList')

challengeRouter.use(requireAuth)

// GET all challenges
challengeRouter.get('/', async (req, res) => {
    const challenges = await Challenge.find().sort({ startDate: -1 })
    res.status(200).json(challenges)
})

// POST new challenge (admin only)
challengeRouter.post('/', requireRoles([ROLES_LIST.Admin, ROLES_LIST.Root]), async (req, res) => {
    const newChallenge = await Challenge.create({ ...req.body, createdBy: req.user })
    res.status(201).json(newChallenge)
})

module.exports = challengeRouter