const Task = require('../models/task')
const User = require('../models/user/User')
const ROLES_LIST = require('../config/rolesList')
const { CustomError } = require('../middleware/errorHandler')
const { validateAuthInputField, validateObjectId } = require('../utils/validation')

exports.getAll = async (req, res, next) => {
  try {
    const userId = req.user._id
  
    const task = {
      Root: await Task.find().sort({ createdAt: -1 }).populate('createdBy', 'name').lean(),
      Admin: await Task.find({ createdBy: userId }).populate('createdBy', 'name').sort({ createdAt: -1 }).lean(),
      User: await Task.find({ assignedTo: userId }).populate('createdBy', 'name').sort({ createdAt: -1 }).lean()
    }
  
    const tasks = task[req.roles]
  
    if (!tasks?.length) throw new CustomError('No tasks record found', 404)
    res.status(200).json(tasks)
  } catch (error) {
    next(error)
  }
}

exports.inspect = async (req, res, next) => {
  try {
    const admin_id = req.user._id
    const user_id = req.body.id
  
    validateObjectId(user_id, 'Task')
    if(!user_id && (admin_id === user_id)) throw new CustomError('User id not found', 404)
  
    const tasks = await Task.find({ assignedTo: user_id }).sort({ createdAt: -1 }).lean()
    if (!tasks?.length) throw new CustomError('No tasks record found', 404)
    console.log(tasks)
  
    res.status(200).json(tasks)
  } catch (error) {
    next(error)
  }
}

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params
  
    validateObjectId(id, 'Task')
  
    const task = await Task.findById(id).lean().exec()
    if (!task) throw new CustomError('No such task record found', 404)
  
    res.status(200).json(task)
  } catch (error) {
    next(error)
  }
}

exports.create = async (req, res, next) => {
  try { 
    const { title, description } = req.body

    validateAuthInputField({ title, description })
  
    const adminId = req.user._id

    const task = await Task.create({ title, description, createdBy: adminId })
    if(!task) throw new CustomError('Something went wrong, during creating new task', 400)

    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
}

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    
    validateObjectId(id, 'Task')
  
    const ownerId = req.user._id
    const createdBy = await Task.find({ createdBy: ownerId }).select('createdBy').lean().exec()
    const owner = req.roles.includes(ROLES_LIST.Admin) && (createdBy === ownerId)
    const updateRight = owner || req.roles.includes(ROLES_LIST.Root)
    if(!updateRight) throw new CustomError('Not authorized to edit this task', 401)
    
    const task = await Task.findOneAndUpdate({ _id: id }, { ...req.body }).lean().exec()
    if (!task) throw new CustomError('No such task record found', 404)
  
    const updatedRecord = await Task.find({ createdBy: ownerId }).sort({createdAt: -1}).lean()

    res.status(200).json(updatedRecord)
  } catch (error) {
    next(error)
  }
}

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params
  
    validateObjectId(id, 'Task')
    
    const ownerId = req.user._id
    const createdBy = await Task.find({ createdBy: ownerId }).select('createdBy').lean().exec()
    const owner = req.roles.includes(ROLES_LIST.Admin) && (createdBy === ownerId)
    const deleteRight = owner || req.roles.includes(ROLES_LIST.Root)
    if(!deleteRight) throw new CustomError('Not authorized to delete this task', 401)
  
    const task = await Task.findByIdAndDelete(id).lean().exec()
    if(!task) throw new CustomError('No such task record found', 404)
  
    res.status(200).json(task)
  } catch (error) {
    next(error)
  }
}

exports.getAssignUser = async (req, res, next) => {
  try {
    const { id } = req.params
  
    validateObjectId(id, 'Task')
  
    const tasks = await Task.findById(id).populate('assignedTo', 'name').select('assignedTo').lean().exec()
    if(!tasks) throw new CustomError('Not assigned to user', 400)
    
    res.status(200).json(tasks)
  } catch (error) {
    next(error)
  }
}

exports.assignUser = async (req, res, next) => {
  try {
    const { task_id, user_id } = req.body
  
    validateObjectId(task_id, 'Task')
  
    user_id.map(id => validateObjectId(id, 'User'))
  
    const ownerId = req.user._id
    const task = await Task.findById(task_id).select('createdBy').lean().exec()
    if (!task) throw new CustomError('Task not found', 404)

    const owner = req.roles.includes(ROLES_LIST.Admin) && (task.createdBy.toString() === ownerId.toString())
    const createRight = owner || req.roles.includes(ROLES_LIST.Root)
    if (!createRight) throw new CustomError('Not authorized to assign this user', 401)
  
    const assignTasks = await Task.findByIdAndUpdate(
      task_id, 
      { $addToSet: { assignedTo: { $each: user_id } } },
      { new: true }
    ).lean().exec()
    if (!assignTasks) throw new CustomError("Something went wrong, Can't assign tasks", 400)
  
    const assignedUser = await Task.findById(task_id).populate('assignedTo', 'name').select('assignedTo').lean().exec()
    if (!assignedUser) throw new CustomError('No assigned user found', 404)
    
    res.status(200).json(assignedUser)
  } catch (error) {
    console.log(error)
    next(error)
  }
}

exports.deleteAssign = async (req, res, next) => {
  try {
    const { id } = req.params
    const { user_id } = req.body
  
    validateObjectId(id, 'Task')
    
    const ownerId = req.user._id
    const createdBy = await Task.find({ createdBy: ownerId }).select('createdBy').lean().exec()
    const owner = req.roles.includes(ROLES_LIST.Admin) && (createdBy === ownerId)
    const deleteRight = owner || req.roles.includes(ROLES_LIST.Root)
    if(!deleteRight) throw new CustomError('Not authorized to delete this user', 401)

    const updatedTask = await Task.findByIdAndUpdate(
      id, 
      { $pull: { assignedTo: user_id }},
      { new: true }
    ).populate('assignedTo', 'name').select('assignedTo').lean().exec()

    if (!updatedTask) throw new CustomError("Failed to update task", 400)
  
    res.status(200).json(updatedTask)
  } catch (error) {
    next(error)
  }
}

exports.getNotAssignUser = async (req, res, next) => {
  try {
    const { id } = req.params
    
    validateObjectId(id, 'Task')
    
    const task = await Task.findById(id).select('assignedTo').lean().exec()
    if (!task) throw new CustomError('Task not found', 404)
    
    const baseQuery = { active: true }
    if (!req.roles.includes(ROLES_LIST.Root)) {
      baseQuery.roles = { $nin: [ROLES_LIST.Root, ROLES_LIST.Admin] }
    } else {
      baseQuery.roles = { $ne: ROLES_LIST.Root }
    }
    
    const notAssign = await User.find({...baseQuery, _id: { $nin: task.assignedTo }}).select('_id name').lean().exec()
    if (!notAssign.length) throw new CustomError('No unassigned users found', 404)
    
    res.status(200).json(notAssign)
  } catch (error) {
    next(error)
  }
}
