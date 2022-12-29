const mongoose = require('mongoose');

const AudioBookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    category: {
        type: [String],
        required: true,
    },
    author: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    coverPhoto: {
        type: String,
        default: null,
    },
    duration: {
        type: String,
        default: null,
    },
    rating: {
        type: Number,
        default: 0,
    },
    favorite: {
        type: Array,
        default: [],
    },
    read: {
        type: Array,
        default: [],
    },
    download: {
        type: Array,
        default: [],
    },
    free: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
        default: 'audio',
    },
    mp3: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mp3",
        required: true
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('AudioBooks', AudioBookSchema);