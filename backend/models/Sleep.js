const mongoose = require('mongoose')

const sleepSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  sleepStart: { type: Date, required: true },
  sleepEnd: { type: Date, required: true },
  durationMinutes: Number,
  sleepStages: {
    light: Number,
    deep: Number,
    rem: Number
  },
  source: { type: String, enum: ['google_fit', 'manual'], default: 'manual' }
}, { timestamps: true })

module.exports = mongoose.model('Sleep', sleepSchema)