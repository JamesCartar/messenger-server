const express = require('express');

const { addGoogle, getGoogle, updateGoogle } = require('../controllers/googleController.js');

const router = express.Router();

router.route('/')
    .get(getGoogle)
    .post(addGoogle)
    .patch(updateGoogle);



module.exports = router;