const usersInPublic = require('./userOnline')
const { userExist, userInPublic, userIndexInPublic, emitError } = require('../helper')

module.exports = async (io, socket, userAccount) => {
  try {
    // 檢查 使用者存在
    const user = await userExist(userAccount)

    // 檢查 使用者在不在上線名單上 (不確定要不要回報錯誤)
    if (!userInPublic(user)) return

    // 從上線名單移除使用者
    usersInPublic.splice(userIndexInPublic(user), 1)

    // 給全部使用者 更新的上線名單
    io.emit('server-update', usersInPublic)
    // broadcast 下線訊息
    socket.broadcast.emit('server-leave', `${user.name} 下線`)
    return
  } catch (err) {
    // 因為使用者已經不在線上，有沒有要處理在考慮
    // 傳給 postman
    emitError(socket, err)
  }
}