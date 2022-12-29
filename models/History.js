const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now(),
    },
}, {
    timestamps: true,
});


module.exports = mongoose.model('history', HistorySchema);