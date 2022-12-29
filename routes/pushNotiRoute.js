const express = require('express');

const { sendNoti } = require('../controllers/pushNotiController.js');

const router = express.Router();

router.route('/')
    .post(sendNoti);


module.exports = router;