const mongoose = require('mongoose');


const pushNotiSchema = new mongoose.Schema({
    token: { 
        type: String,
        required: true,
    },
}, {
    timestamps: true
})

module.exports = mongoose.model('PushNoti', pushNotiSchema);