const {
  emitError,
  findUserInPublic,
  findAllSubscribers,
  checkNotice
} = require('../helper')
const { Notice } = require('../../models')
const { Op } = require('sequelize')
const usersOnline = require('../modules/userOnline')
const getNotice = require('../modules/getNotice')

module.exports = async (socket, action, targetId) => {
  try {
    // 確認使用者是否登入
    const currentUser = findUserInPublic(socket.id, 'socketId')
    const actions = ['tweet', 'like', 'reply', 'follow']

    if (actions.includes(action)) {
      // 當user新增一筆推文時
      if (action === 'tweet') {
        // 找出當前使用者的所有訂戶
        const subscribers = await findAllSubscribers(currentUser.id)
        // 更新訂戶的newNotice時間
        await Notice.update(
          { newNotice: new Date() },
          {
            where: { userId: { [Op.in]: subscribers } }
          }
        )
        console.log(`NewNotices of userId:${currentUser.id}'s subscribers have updated.`)

        usersOnline.forEach(u => {
          // find online subscribers
          if (subscribers.includes(u.id)) {
            // send new notice message
            if (u.currentRoom && u.currentRoom === 'notice') {
              getNotice(socket)
            }
            u.unreadNotice = checkNotice(u.id)
            socket.to(u.socketId).emit('server-push-notice', 'new notice!')
          }
        })
      } else {
        // 對某人的tweet reply、like或follow某人
        if (!targetId) throw new Error('targetId is required!')
        // 更新targetUser的notice
        await Notice.update(
          { newNotice: new Date() },
          {
            where: { userId: targetId }
          }
        )
        console.log(`NewNotice of userId:${targetId} has updated.`)
        const targetUserOnline = usersOnline.find(u => u.id.toString() === targetId)
        // if targetUser online, send new notice message
        if (targetUserOnline) {
          if (targetUserOnline.currentRoom && targetUserOnline.currentRoom === 'notice') {
            // if user in notice, trigger getNotice
            getNotice(socket)
          }
          socket.to(targetUserOnline.socketId).emit('server-push-notice', 'new notice!')
        }
      }
    } else {
      throw new Error(`Action: ${action} didn't exist!`)
    }
  } catch (err) {
    emitError(socket, err)
  }
}