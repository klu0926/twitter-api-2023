const { emitError, findUserInPublic } = require('../helper')
const { Chat, User } = require('../../models')
const { Op } = require('sequelize')

module.exports = async (io, socket) => {
  try {
    // 確認使用者是否登入
    const currentUser = findUserInPublic(socket.id, 'socketId')

    // 找出目前登入的使用者所有的room
    const rooms = currentUser.rooms

    // 根據roomId去搜尋message，同一個roomId只留最新一筆訊息
    const message = await Chat.findAll({
      where: {
        roomId: { [Op.in]: rooms }
      },
      include: [
        { model: User, attributes: ['id', 'name', 'account', 'avatar'] }
      ],
      attributes: ['id', 'message', 'roomId', 'timestamp'],
      order: [['id', 'DESC']]
    })
    const newMessage = []
    message.forEach(m => {
      const roomIdExist = newMessage.some(d => d.roomId === m.roomId)
      if (!roomIdExist) newMessage.push(m.toJSON())
    })
    console.log('new:', newMessage)
    // 回傳最新訊息
    io.emit('server-new-message', newMessage)
  } catch (err) {
    emitError(socket, err)
  }
}
