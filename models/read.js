'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class UserRead extends Model {
    static associate (models) {
      UserRead.belongsTo(models.User, { foreignKey: 'userId' })
      UserRead.belongsTo(models.Room, { foreignKey: 'roomId' })
    }
  }
  UserRead.init(
    {
      userId: DataTypes.INTEGER,
      roomId: DataTypes.INTEGER,
      lastRead: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'UserRead',
      tableName: 'UserReads'
    }
  )
  return UserRead
}
