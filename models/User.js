const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        default: null,
    },
    password: {
        type: String,
        default: null,
    },
    salt: {
        type: String,
    },
    dob: {
        type: String,
        default: null,
    },
    role: {
        type: String,
        default: 'user',
    },
    phone: {
        type: String,
        default: null,
    },  
    profileImage: {
        type: String,
        default: null,
    },
    thirdParty: {
        type: String,
        default: null,
    },
    thirdPartyId: {
        type: String,
    },
    status: {
        type: String, 
        "enum": ["active", "suspended"],
    },
    sendNoti: {
        type: Boolean, 
        "enum": [true, false],
        default: false,
    },
    notiData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PushNoti',
        required: true,
    }
}, {
    timestamps: true
})


module.exports = mongoose.model('Users', userSchema);