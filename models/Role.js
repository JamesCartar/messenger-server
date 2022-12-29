const mongoose = require('mongoose');


const WatchListSchema = new mongoose.Schema({
    role: { 
        type: String,
        required: true,
    },
    permissions: {
        type: Object,
        required: true,
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('roles', WatchListSchema);