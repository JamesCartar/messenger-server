const mongoose = require('mongoose');

const VideoBookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    category: {
        type: [String],
        required: true,
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
        default: 'video',
    },
    mp4: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mp4",
        required: true
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('VideoBooks', VideoBookSchema);