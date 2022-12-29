const router = require('express').Router()
const passport = require('passport')
require('dotenv').config


const { register, login, checkEmail, dashboardLogin, loginSuccess, thirdPartyLogout, loginFailed } = require('../controllers/authController.js')

const CLIENT_URI = process.env.CLIENT_URI

router.post('/register', register)
router.post('/checkEmail', checkEmail)
router.post('/login', login)
router.post('/dashboardLogin', dashboardLogin)

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}))
router.get('/google/callback', passport.authenticate('google', {
    successRedirect: CLIENT_URI,
    failureRedirect: '/login/failed',
}))

router.get("/facebook", passport.authenticate("facebook", { session: false, scope: [ "public_profile", "email" ] }))
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: CLIENT_URI,
    failureRedirect: "/login/failed",
  })
)

router.get('/logout', thirdPartyLogout)
router.get('/login/failed', loginFailed)
router.get('/login/success', loginSuccess)

module.exports = router