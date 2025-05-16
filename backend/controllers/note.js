const Note = require('../models/Note')
const ROLES_LIST = require('../config/rolesList')
const { CustomError } = require('../middleware/errorHandler')
const { validateAuthInputField, validateObjectId } = require('../utils/validation')

exports.getAll = async (req, res, next) => {
  try {
    const user_id = req.user._id
  
    const notes = await Note.find({ user_id }).sort({createdAt: -1}).lean()
    if (!notes?.length) throw new CustomError('No notes record found', 404)
  
    res.status(200).json(notes)
  } catch (error) {
    next(error)
  }
}

exports.adminGetAll = async (req, res, next) => {
  try {
    const admin_id = req.user._id
    const user_id = req.body.id
  
  validateObjectId(user_id, 'Note')
  if(!user_id && (admin_id === user_id)) throw new CustomError('User id not found', 404)
  
    const notes = await Note.find({user_id: user_id}).sort({ createdAt: -1 }).lean()
    if (!notes?.length) throw new CustomError('No notes record found', 404)
  
    res.status(200).json(notes)
  } catch (error) {
    next(error)
  }
}

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params
    const user_id = req.user._id
  
    validateObjectId(id, 'Note')
    
    const note = await Note.find({ user_id: user_id, _id: id }).lean().exec()
    if (!note[0]) throw new CustomError('No such note record found', 404)
  
    res.status(200).json(note[0])
  } catch (error) {
    next(error)
  }
}

exports.adminGetById = async (req, res, next) => {
  try {
    const note_id = req.body.id
  
    validateObjectId(note_id, 'Note')
    
    const note = await Note.findById(note_id).lean().exec()
    if (!note) throw new CustomError('No such note record found', 404)
  
    res.status(200).json(note)
  } catch (error) {
    next(error)
  }
}

exports.create = async (req, res, next) => {
  try {
    const { title, text, tag } = req.body

    validateAuthInputField({ title, text })

    const userId = req.user._id
    const targetUserId = req.body.id // user id that Admin use to update user record
    let idToCreate = userId
    
    if(targetUserId && (userId !== targetUserId) && (req.roles.includes(ROLES_LIST.Admin))){
      idToCreate = targetUserId
    }

    const notes = await Note.create({ title, text, user_id: idToCreate, tag })
    if(!notes) throw new CustomError('Something went wrong, during creating new note', 400)

    res.status(201).json(notes)
  } catch (error) {
    next(error)
  }
}

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, text } = req.body
  
    validateAuthInputField({ title, text })
    validateObjectId(id, 'Note')
  
    const userId = req.user._id //normal record update id (user id/admin id) 
    const targetUserId = req.body.id //user id that Admin use to update user record
    let idToUpdate = userId

    if(targetUserId && (userId !== targetUserId) && (req.roles.includes(ROLES_LIST.Admin))){
      idToUpdate = targetUserId
    }
    
    const notes = await Note.findOneAndUpdate({ _id: id }, { ...req.body }).lean().exec()
    if (!notes) throw new CustomError('No such note record found', 404)
    
    //after update return new record
    const updatedRecord = await Note.find({ user_id: idToUpdate }).sort({createdAt: -1}).lean()

    res.status(200).json(updatedRecord)
  } catch (error) {
    next(error)
  }
}

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params
  
    validateObjectId(id, 'Note')
  
    const note = await Note.findByIdAndDelete(id).lean().exec()
    if(!note) throw new CustomError('No such note record found', 404)
  
    res.status(200).json(note)
  } catch (error) {
    next(error)
  }
}