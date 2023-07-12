const { emitError, findUserInPublic } = require('../helper')
const { Chat, User } = require('../../models')
const { Op, literal, QueryTypes } = require('sequelize')

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
      attributes: [
        'id', 'message', 'roomId', 'timestamp',
        [
          literal(`(
            SELECT COUNT(*) 
            FROM Chats AS c 
            LEFT JOIN UserReads AS r 
            ON r.roomId = c.roomId AND r.userId = :userId 
            WHERE c.roomId = Chat.roomId AND c.timestamp > r.lastRead  )`
          ),
          'unreadMessageCounts'
        ]
      ],
      order: [['id', 'DESC']], // 最新的訊息在最上方
      replacements: { userId: currentUser.id },
      type: QueryTypes.SELECT
    })
    console.log(message)
    // 暫時想不到直接在DB處理的方式，先抓出來處理
    const newMessage = []
    const allUnreadMessage = 0
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
