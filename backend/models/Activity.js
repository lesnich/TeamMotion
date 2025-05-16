const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    date: { type: Date, required: true },
    steps: Number,
    calories: Number,
    distance: Number,
    heartRateAvg: Number,
    minutesActive: Number,
    elevationGain: Number,
    hydration: Number,
    cyclingDistance: Number,
    source: { type: String, enum: ['google_fit', 'manual'], default: 'manual' }
}, { timestamps: true })

module.exports = mongoose.model('Activity', activitySchema)