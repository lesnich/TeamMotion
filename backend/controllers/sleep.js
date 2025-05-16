const mongoose = require('mongoose')
const Sleep = require('../models/sleep')
const validator = require('validator')
const ROLES_LIST = require('../config/rolesList')
const moment = require('moment')

exports.getAll = async (req, res) => {
  const user_id = req.user._id

  const sleeps = await Sleep.find({user_id}).sort({createdAt: -1}).lean()
  if (!sleeps?.length) return res.status(400).json({ error: 'No sleeps record found' })

  res.status(200).json(sleeps)
}

exports.adminGetAll = async (req, res) => {
  const admin_id = req.user._id
  const user_id = req.body.id

  if(!user_id && (admin_id == user_id)) return res.status(400).json({ error: 'User id not found' })
  if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(404).json({error: 'No such sleep id found'})

  const sleeps = await Sleep.find({user_id: user_id}).sort({createdAt: -1}).lean()
  if (!sleeps?.length) return res.status(400).json({ error: 'No sleeps record found' })

  res.status(200).json(sleeps)
}

exports.getById = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({error: 'No such sleep id found'})

  const sleep = await Sleep.findById(id).lean().exec()
  if (!sleep) return res.status(404).json({error: 'No such sleep record found'})

  res.status(200).json(sleep)
}

exports.create = async (req, res) => {
  const {sleep, wake} = req.body

  try {
    const userId = req.user._id
    const targetUserId = req.body.id // user id that Admin use to update user record
    let idToCreate = userId

    const start = moment(sleep)
    const end = moment(wake)
    const duration = end.diff(start, 'minutes')
    
    if((sleep > wake) || duration == 0) throw Error('Invalid datetime input')
    
    if(targetUserId && (userId !== targetUserId) && (req.roles.includes(ROLES_LIST.Admin))){
      idToCreate = targetUserId
    }

    const sleeps = await Sleep.create({ sleep, wake, duration, user_id: idToCreate })
    if(!sleeps) throw new CustomError('Something went wrong, during creating new sleep record', 400)
    
    res.status(201).json(sleeps)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

exports.update = async (req, res) => {
  const { id } = req.params
  const {sleep, wake} = req.body
  
  const isIdEmpty = validator.isEmpty(id, { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Sleep id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such sleep id found'})

  const userId = req.user._id //normal record update id (user id/admin id) 
  const targetUserId = req.body.id //user id that Admin use to update user record
  let idToUpdate = userId
  if(targetUserId && (userId !== targetUserId) && (req.roles.includes(ROLES_LIST.Admin))){
    idToUpdate = targetUserId
  }

  const start = moment(sleep)
  const end = moment(wake)
  const duration = end.diff(start, 'minutes')
  req.body = {...req.body, duration: duration}
  
  const sleeps = await Sleep.findOneAndUpdate({_id: id}, {...req.body }).lean().exec()
  if (!sleeps) return res.status(400).json({error: 'No such sleep record found'})
  
  //after update return new record
  const updatedRecord = await Sleep.find({user_id: idToUpdate}).sort({createdAt: -1}).lean()
  res.status(200).json(updatedRecord)
}

exports.delete = async (req, res) => {
  const { id } = req.params

  const isIdEmpty = validator.isEmpty(id, { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Sleep id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such sleep id found'})

  const sleep = await Sleep.findByIdAndDelete(id).lean().exec()
  if(!sleep) return res.status(400).json({error: 'No such sleep record found'})

  res.status(200).json(sleep)
}