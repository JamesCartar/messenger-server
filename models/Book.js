const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
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
        default: 'book',
    },
    pdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pdf",
        required: true,
    },
    packagePlan: {
        type: String,
        default: 'standard',
        "enum": ['standard', 'addon'],
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('Books', BookSchema);