const express = require('express');

const { getAllNotifications, addNotification, getNotification, updateNotification } = require('../controllers/notificationController.js');

const router = express.Router();

router.route('/')
    .get(getAllNotifications)
    .post(addNotification);


router.route('/:id')
    .get(getNotification)
    .patch(updateNotification);


module.exports = router;