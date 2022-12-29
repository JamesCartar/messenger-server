const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
    host: {
        type: String,
        required: true,
    },
    port: {
        type: Number,
        required: true,
    },
    secure: {
        type: Boolean,
        default: true,
    },
    authUser: {
        type: String,
        required: true,
    },
    authPass: {
        type: String,
        required: true,
    },
    from: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('Email', EmailSchema);