const mongoose = require('mongoose');

const AddonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    books: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PushNoti',
    }]
}, {
    timestamps: true,
});


module.exports = mongoose.model('Addons', AddonSchema);