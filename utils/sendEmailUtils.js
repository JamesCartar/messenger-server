if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const nodemailer = require('nodemailer');
const emailModel = require('../models/Email.js');

async function sendEmail() {
    const emailSetting = await emailModel.findOne({});

    let transport = nodemailer.createTransport({
        service: 'gmail',
        port: 465,
        secure: false, // use TLS
        auth: {
            user: 'hein08308@gmail.com',
            pass: 'ieohplvmahvfkvaf',
        },
    });
    return transport
};

module.exports = sendEmail;
