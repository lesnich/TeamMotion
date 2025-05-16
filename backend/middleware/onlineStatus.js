const mongoose = require('mongoose')
const User = require('../models/user/User')
const ROLES_LIST = require('../config/rolesList')
const { validateObjectId } = require('../utils/validation')

const setupSocket = (io) => {
  const userSessions = new Map()

  const updateUserStatus = async (userId, isOnline) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return new Error('Invalid user id')

    await User.findByIdAndUpdate(
      userId,
      { $set: { isOnline, lastActive: new Date() } },
      { new: true }
    ).select('-password -otp').lean()

    await updateUserLists()
  }

  const updateUserLists = async () => {
    const adminSession = userSessions.get('admin')
    const rootSession = userSessions.get('root')

    if (adminSession) {
      const users = await getUsersForAdmin(adminSession.id)
      io.to(adminSession.socketId).emit('adminUpdateUserList', users)
    }

    if (rootSession) {
      const users = await User.find().sort({ isOnline: -1, lastActive: -1 }).select('-password -otp').lean()
      io.to(rootSession.socketId).emit('adminUpdateUserList', users)
    }
  }

  const getUsersForAdmin = async (adminId) => {
    const query = {
      $or: [
        { roles: ROLES_LIST.User },
        { _id: adminId }
      ],
      roles: { $ne: ROLES_LIST.Root }
    }
    return User.find(query).sort({ isOnline: -1, lastActive: -1 }).select('-password -otp').lean()
  }

  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id)

    socket.on('online', async (userId) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) return new Error('Invalid user id')

      const user = await User.findById(userId).select('_id roles').lean().exec()
      socket.userId = userId

      if (user.roles.includes(ROLES_LIST.Admin)) {
        console.log('Admin connected:', socket.id)
        userSessions.set('admin', { id: user._id, socketId: socket.id })
        socket.join(socket.id)
      }

      if (user.roles.includes(ROLES_LIST.Root)) {
        console.log('Root connected:', socket.id)
        userSessions.set('root', { id: user._id, socketId: socket.id })
        socket.join(socket.id)
      }

      await updateUserStatus(userId, true)
    })

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.userId)
      if (socket.userId) {
        await updateUserStatus(socket.userId, false)
      }
    })
  })
}

module.exports = setupSocket