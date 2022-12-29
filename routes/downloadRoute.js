const express = require('express');

const { getAllDownload, getDownload, clearDownload } = require('../controllers/downloadController.js');

const router = express.Router();

router.route('/')
    .get(getAllDownload);

router.route('/clear')
    .delete(clearDownload);
    
router.route('/:id')
    .get(getDownload);




module.exports = router;