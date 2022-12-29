const express = require('express');

const { getAllRole, addRole, getRole, updateRole, deleteRole } = require('../controllers/roleController.js');

const router = express.Router();

router.route('/')
    .get(getAllRole)
    .post(addRole);


router.route('/:id')
    .get(getRole)
    .patch(updateRole)
    .delete(deleteRole);


module.exports = router;