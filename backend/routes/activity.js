const router = require('express').Router()
const Activity = require('../models/Activity')
const requireAuth = require('../middleware/requireAuth')

router.use(requireAuth)

// GET all activities for current user
router.get('/', async (req, res) => {
    const activities = await Activity.find({ user_id: req.user }).sort({ date: -1 })
    res.status(200).json(activities)
})

// POST new activity
router.post('/', async (req, res) => {
    const newActivity = await Activity.create({ ...req.body, user_id: req.user })
    res.status(201).json(newActivity)
})

module.exports = router