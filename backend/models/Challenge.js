const mongoose = require('mongoose')

const challengeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['steps', 'calories', 'distance', 'minutesActive', 'cyclingDistance'], required: true },
    mode: { type: String, enum: ['individual', 'team'], default: 'individual' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teams: [{
        name: String,
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    winners: [{ user_id: mongoose.Schema.Types.ObjectId, place: Number }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' }
}, { timestamps: true })

module.exports = mongoose.model('Challenge', challengeSchema)
