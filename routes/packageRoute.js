const express = require('express');

const { getAllPackage, addPackage, getPackage, updatePackage, deletePackage, purchase, cancel } = require('../controllers/packageController.js');

const router = express.Router();

router.route('/')
    .get(getAllPackage)
    .post(addPackage);

router.post('/purchase', purchase);
router.post('/cancel', cancel);

router.route('/:id')
    .get(getPackage)
    .patch(updatePackage)
    .delete(deletePackage);


module.exports = router;