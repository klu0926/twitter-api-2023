const jwt = require('jsonwebtoken')
const db = require('../models')
const { User, Tweet, Like, Reply } = db
const sequelize = require('sequelize')
const helpers = require('../_helpers')

const adminController = {
  login: (req, res, next) => {
    try {
      // 製作token給管理員
      const userData = req.user
      delete userData.password
      const token = jwt.sign(userData, process.env.JWT_SECRET, {
        expiresIn: '30d'
      })
      res.status(200).json({
        status: 'success',
        data: {
          token,
          user: userData
        }
      })
    } catch (err) {
      next(err)
    }
  },
  getUsers: async (req, res, next) => {
    try {
      const users = await User.findAll({
        attributes: {
          exclude: ['password'],
          include: [
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Followships WHERE followingId = User.id)'
              ),
              'followersCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Followships WHERE followerId = User.id)'
              ),
              'followingsCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Tweets WHERE UserId = User.id)'
              ),
              'tweetsCount'
            ]
            // ,[
            //   sequelize.literal(
            //     '(SELECT COUNT(*) FROM likes l INNER JOIN tweets t on l.TweetId = t.id where t.UserId = User.id)'
            //   ),
            //   'receivedLikesCount'
            // ]
          ]
        },
        order: [[sequelize.literal('TweetsCount'), 'DESC']]
      })

      // reorganize users data
      const usersData = users.map(user => {
        const userData = user.toJSON()
        return {
          ...userData
        }
      })

      res.status(200).json(usersData)
    } catch (err) {
      next(err)
    }
  },
  getTweets: async (req, res, next) => {
    try {
      const currentUserId = helpers.getUser(req).id
      const tweets = await Tweet.findAll({
        attributes: {
          include: [
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Replies WHERE TweetId = Tweet.id)'
              ),
              'repliesCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Likes WHERE TweetId = Tweet.id)'
              ),
              'likesCount'
            ]
          ]
        },
        include: [
          {
            model: User,
            attributes: { exclude: ['password'] }
          },
          {
            model: Like,
            attributes: ['UserId']
          }
        ],
        order: [['createdAt', 'DESC']]
      })
      if (!tweets) throw new Error('找不到tweets資料！')
      // 回傳全部tweet，最新的在前面
      const tweetsData = tweets.map(tweet => ({
        ...tweet.toJSON(),
        isCurrentUserLiked: tweet.Likes.some(
          like => like.UserId === currentUserId
        )
      }))

      res.json(tweetsData)
    } catch (err) {
      next(err)
    }
  },
  deleteTweet: async (req, res, next) => {
    try {
      // 確認是否為admin身分
      const isCurrentUserAdim = helpers.getUser(req).role === 'admin'
      if (!isCurrentUserAdim) throw new Error('您沒有權限刪除推文')

      const tweet = await Tweet.findByPk(req.params.id)
      if (!tweet) throw new Error('推文不存在!')
      await Reply.destroy({ where: { TweetId: req.params.id } })
      await Like.destroy({ where: { TweetId: req.params.id } })

      await tweet.destroy()
      res.status(200).json({
        status: 'success',
        message: '成功刪除推文'
      })
    } catch (err) {
      next(err)
    }
  },
  getUsersData: async (req, res, next) => {
    try {
      const users = await User.findAll({
        attributes: {
          exclude: ['password'],
          include: [
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Followships WHERE followingId = User.id)'
              ),
              'followersCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Followships WHERE followerId = User.id)'
              ),
              'followingsCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM Tweets WHERE UserId = User.id)'
              ),
              'tweetsCount'
            ],
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM likes l INNER JOIN tweets t on l.TweetId = t.id where t.UserId = User.id)'
              ),
              'receivedLikesCount'
            ]
          ]
        },
        order: [[sequelize.literal('TweetsCount'), 'DESC']]
      })

      // reorganize users data
      const usersData = users.map(user => {
        const userData = user.toJSON()
        return {
          ...userData
        }
      })

      res.status(200).json(usersData)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = adminController
