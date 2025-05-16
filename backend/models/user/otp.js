const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
    requests: { 
      type: Number, 
      default: 0 
    },
    requestDate: Date,
    errorCount: { 
      type: Number, 
      default: 0 
    },
    errorDate: Date,
})

module.exports = otpSchema