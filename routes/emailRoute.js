const express = require('express');

const { addEmail, getEmail, updateEmail } = require('../controllers/emailController.js');

const router = express.Router();

router.route('/')
    .get(getEmail)
    .post(addEmail)
    .patch(updateEmail);



module.exports = router;