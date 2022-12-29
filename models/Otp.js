const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
    varified: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('otp', OtpSchema);