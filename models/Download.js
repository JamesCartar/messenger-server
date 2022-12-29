const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
    },
    book: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Books",
        }
    ],
    audio: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AudioBooks",
        }
    ],
    video: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VideoBooks",
        }
    ]
}, {
    timestamps: true,
});


module.exports = mongoose.model('Download', DownloadSchema);