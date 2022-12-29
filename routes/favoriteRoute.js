const express = require('express');

const { getAllfavorite, getfavorite, clearfavorite } = require('../controllers/favoriteController.js');

const router = express.Router();

router.route('/')
    .get(getAllfavorite);

router.route('/clear')
    .delete(clearfavorite);
    
router.route('/:id')
    .get(getfavorite);




module.exports = router;