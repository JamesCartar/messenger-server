const mongoose = require('mongoose');


const mp3Schema = new mongoose.Schema({
    file: { 
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Mp3', mp3Schema);