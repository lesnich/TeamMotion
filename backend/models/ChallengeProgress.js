const mongoose = require('mongoose')

const challengeProgressSchema = new mongoose.Schema({
    challenge_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
})

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema)