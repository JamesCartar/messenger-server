const express = require('express');

const { getAllVideoBooks, addVideoBook, getVideoBook, updateVideoBook, deleteVideoBook, favorite, download, read, getAllCategory } = require('../controllers/videoBookController.js');

const router = express.Router();

router.route('/')
    .get(getAllVideoBooks)
    .post(addVideoBook);


router.route('/categories')
    .get(getAllCategory);

// adding and removing favorite, download and read count 
router.route('/:id/favorite')
    .post(favorite);

router.route('/:id/download')
    .post(download);

router.route('/:id/read')
    .post(read);


router.route('/:id')
    .get(getVideoBook)
    .patch(updateVideoBook)
    .delete(deleteVideoBook);


module.exports = router;