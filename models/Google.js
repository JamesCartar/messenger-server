const mongoose = require('mongoose');

const googleSchema = new mongoose.Schema({
    clientSecret: {
        type: String,
        required: true,
    },
    clientId: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});


module.exports = mongoose.model('Google', googleSchema);