const mongoose = require('mongoose');


const mp4Schema = new mongoose.Schema({
    file: { 
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Mp4', mp4Schema);