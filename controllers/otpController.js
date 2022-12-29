if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// models
const userModel = require('../models/User.js');
const otpModel = require('../models/Otp.js');
const historyModel = require('../models/History.js');
const emailModel = require('../models/Email.js');
const notificationModel = require('../models/Notification.js');
const sendEmailUtils = require('../utils/sendEmailUtils.js');
const passwordUtils = require('../utils/passwordUtils.js');


async function emailTemplate(name, otp, companyName) {
    const notification = await notificationModel.findOne({subject: 'password reset'});

    let html = notification.template
        .replace('{{name}}', name)
        .replace('{{otp}}', `<b>${otp}</b>`)
        .replace("{{company_name}}", companyName);

    return {subject: notification.subject, html: html};
}


const sendEmail = async (req, res, next) => {
    const { email: emailToSend } = req.body;
    try {
        const user = await userModel.findOne({ email: emailToSend });
        if(!user) return res.status(409).json({success: false, msg: 'User does not exist !'});

        const otpCode = `${Math.floor(1000 + Math.random() * 90)}`;

        var transport = await sendEmailUtils();
        const emailSetting = await emailModel.findOne({});
        const emailData = await emailTemplate(user.name, otpCode, 'ethical digit')
        //   send mail with defined transport object
        await transport.sendMail({
        from: `${emailSetting.from} ${emailSetting.authUser}`,
        to: emailToSend,
        subject: emailData.subject,
        html: emailData.html,
        });


        const savedOtp = new otpModel({
            email: emailToSend,
            code: otpCode,
        });
        await savedOtp.save();
            
        return res.status(200).json({success: true, msg: 'Check your email !'});
        // console.log("Message sent: %s", info.messageId);
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message});
    }
};


const varifyOtp = async (req, res, next) => {
    const { otp, email } = req.body;
    try {
        const otpData = await otpModel.findOne({$and: [{code: otp}, {email: email}]});
        
        if(!otpData) return res.status(404).json({success: false, msg: 'There is no user with that email or invalid OTP !'})
       
        // calculating the duration of otp
        const oldDate = otpData.createdAt;
        const newDate = new Date();
        const msToTime = (ms) => ({
            hours: Math.trunc(ms/3600000),
            minutes: Math.trunc((ms/3600000 - Math.trunc(ms/3600000))*60) + ((ms/3600000 - Math.trunc(ms/3600000))*60 % 1 != 0 ? 1 : 0),
        })
        const duration = msToTime(Math.abs(newDate-oldDate));

        if(duration.hours < 24) {
            const otpData = await otpModel.updateOne({$and: [{code: otp}, {email: email}]}, {$set: {varified: true}}, {new: true});

            return res.status(500).json({success: true, msg: 'OTP varification successfull !'});
        } else {
            return res.status(500).json({success: false, msg: 'The OTP expired !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message});
    }
}

const changePassword = async (req, res, next) => {
    const { email, password } = req.body;
    
    try {
        const otpData = await otpModel.findOne({email: email});
        if(otpData && otpData.varified) {
            const passwordData = {};
            const saltHash = passwordUtils.genPassword(password);
            passwordData.salt = saltHash.salt;
            passwordData.password = saltHash.hash;
            
            const changinPasswordUser = await userModel.findOne({email: email});
            const isUpdated = await userModel.updateOne({ email: email }, { $set: passwordData }, { new: true });
            
            if(isUpdated.modifiedCount < 1)
                return res.status(404).json({success: true, msg: 'User does not exist or please try again !'});
            // saving history
            const history = new historyModel({
                name: changinPasswordUser.name,
                role: changinPasswordUser.role,
                email: changinPasswordUser.email,
                action: `Changing Password`,
                message: `Changing password of the user called ${changinPasswordUser.name}.`
            });
            await history.save();
            await otpModel.deleteOne({email: email});
            return res.status(404).json({success: true, msg: `User with the email of ${email} has successfully changed the password !`});  
        } else {
            return res.status(404).json({success: false, msg: 'User does not exist or please varify the OTP first !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message});
    };
};

module.exports = { sendEmail, changePassword, varifyOtp };


// kdpgrnpakxdmcrmo