const asyncWrapper = require('../milddlewares/async.js')

const register = asyncWrapper(async (req, res, next) => {
    res.status(200).json({ success: true, message: 'You have successfully register !' })
})

const login = asyncWrapper(async (req, res, next) => {
    res.status(200).json({ success: true, message: 'You have successfully login !' })
})


module.exports = { register, login }