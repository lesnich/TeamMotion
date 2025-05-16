const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: true })

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    departments: [departmentSchema],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Company', companySchema)