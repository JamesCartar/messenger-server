const express = require('express');

const { getAllHistory, getHistory, deleteHistory, clearHistory } = require('../controllers/historyController.js');

const router = express.Router();

router.route('/')
    .get(getAllHistory)
    .delete(clearHistory);

router.route('/:id')
    .get(getHistory)
    .delete(deleteHistory);

module.exports = router;