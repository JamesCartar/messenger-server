const express = require('express');

const { getAllBooks, addBook, getBook, updateBook, deleteBook, favorite, download, read, getAllCategory } = require('../controllers/bookController.js')

const router = express.Router();

router.route('/')
    .get(getAllBooks)
    .post(addBook);

router.route('/categories')
    .get(getAllCategory);

router.route('/:id')
    .get(getBook)
    .patch(updateBook)
    .delete(deleteBook);


// adding and removing favorite, download and read count 
router.route('/:id/favorite')
    .post(favorite);

router.route('/:id/download')
    .post(download);

router.route('/:id/read')
    .post(read)


module.exports = router;