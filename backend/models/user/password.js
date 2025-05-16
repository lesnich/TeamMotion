const mongoose = require('mongoose')

const passwordSchema = new mongoose.Schema({
    hashed: {
      type: String,
      required: true
    },
    errorCount: { 
      type: Number, 
      default: 0 
    },
    errorDate: Date,
})

module.exports = passwordSchema