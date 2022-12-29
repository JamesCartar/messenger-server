const mongoose = require('mongoose');


const UtilsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
    },
    subject: { 
        type: String,
        required: true,
    },
    template: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('notifications', UtilsSchema);