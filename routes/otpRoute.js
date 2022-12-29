const express = require('express');

const { sendEmail, changePassword, varifyOtp } = require('../controllers/otpController.js');

const router = express.Router();

router.post('/send_email', sendEmail);
router.post('/varify_otp', varifyOtp)
router.post('/change_password', changePassword);

module.exports = router;