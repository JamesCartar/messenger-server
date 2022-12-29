const express = require('express');

const { getAllAudioBooks, addAudioBook, getAudioBook, updateAudioBook, deleteAudioBook, favorite, download, read, getAllCategory } = require('../controllers/audioBookController.js');

const router = express.Router();

router.route('/')
    .get(getAllAudioBooks)
    .post(addAudioBook);

  
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
    .get(getAudioBook)
    .patch(updateAudioBook)
    .delete(deleteAudioBook);



module.exports = router;