const mongoose = require('mongoose');


const PackageSchema = new mongoose.Schema({
    name: { 
        type: String,
        required: true,
    },
    month: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('packages', PackageSchema);