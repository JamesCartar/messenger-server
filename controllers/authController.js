require('dotenv').config()
const admin = require('firebase-admin')
const utils = require('../utils/passwordUtils.js')
const userModel = require('../models/User.js')
const pushNotiModel = require('../models/PushNoti.js')
const historyModel = require('../models/History.js')
const sendEmailUtils = require('../utils/sendEmailUtils.js')
const emailModel = require('../models/Email.js')
const notificationModel = require('../models/Notification.js')
let { ObjectId } = require('mongodb')

async function emailTemplate(name, email, password) {
    const notification = await notificationModel.findOne({type: 'login'})

    let html = notification.template
        .replace('{{name}}', name)
        .replace('{{email}}', email)
        .replace("{{password}}", password)

    return {subject: notification.subject, html: html}
}


const register = async (req, res, next) => {

    const { firstName, lastName, email, password, sendNoti } = req.body;
    if(!firstName || !lastName || !email || !password) 
        return res.status(422).json({success: false, msg: 'Please provide all the necessity fields !'})
    try {    
        const userExist = await userModel.findOne({ email: req.body.email });
        if(userExist) return res.status(409).json({success: false, msg: 'User already exists!'});
        
        const saltHash = utils.genPassword(password);
        req.body.salt = saltHash.salt;
        req.body.password = saltHash.hash;

        // Get a reference to the Firebase Messaging instance
        const messaging = admin.messaging();
            
        // Subscribe the user to the topic
        messaging.subscribeToTopic(req.body.notiToken, 'all')
        const notiData = {
            token: req.body.notiToken
        }
        const pushNotiData = await pushNotiModel.create(notiData);
        req.body.notiData = pushNotiData._id;

        if(req.body.sendNoti === 'true') {
            req.body.sendNoti = true;
        } else {
            req.body.sendNoti = false;
        }

        const user = await userModel.create(req.body);
        const jwt = utils.issueJWT(user);
        var transport = await sendEmailUtils();
        const emailSetting = await emailModel.findOne({});
        
        // let emailData = await emailTemplate(newUser.name, newUser.email, password);
        //   send mail with defined transport object
        let info = await transport.sendMail({
        from: `ShareMe 'hein08308@gmail.com'`,
        to: user.email,
        subject: 'Sign up',
        html:  `
            <h1>333333333333333333333333333333</h1>
            <h1>33333333333333333</h1>
            <h1>3333333333333333333333333333</h1>
        `,
        });
        
        const {_doc: { password :notToSendPassword, salt :notToSendSalt, ...userInfoToSend }} = user;
        // saving history
        // const history = new historyModel({
        //     name: user.name,
        //     role: user.role,
        //     email: user.email,
        //     action: 'Register',
        //     message: `Register user called ${user.name}`
        // })
        // await history.save();
        
        return res.status(201).json({ 
            success: true, 
            user: userInfoToSend,
            token: jwt.token, 
            expires: jwt.expires
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, msg: error.message});
    }
}

const checkEmail = async (req, res, next) => {
    try {
        const user = await userModel.findOne({ email: req.body.email });
        if(!user) return res.status(404).json({success: false, msg: 'There is no user with that email !'})
        res.status(200).json({success: true, email: user.email})
    } catch (error) {
        res.status(500).json({success: false, msg: error.message})
    }
}

const login = async  (req, res, next) => {
    try {
        console.log(req.body)
        const user = await userModel.findOne({ email: req.body.email })
        if(!user) 
            return res.status(401).json({success: false, msg: 'Could not find the user!'})
    
        // saving history
        // const history = new historyModel({
        //     name: user.name,
        //     role: user.role,
        //     email: user.email,
        //     action: 'Login',
        //     message: `Login user called ${user.name}`
        // })
        // await history.save()
    
        let todayDate = new Date()
        const duration = todayDate - user.packageExpiresAt
        if(duration > 0) {
            let updatesData = {
                premium: false,
                package: null,
                packageStartDate: new Date(),
                packageExpiresAt: new Date(),
            }
            await userModel.updateOne({_id: ObjectId(user._id)}, {$set: updatesData}, {new: true})
        }
        
        if(user.status === 'suspended') 
            return res.status(404).json({success: false, msg: 'You are account is temporarily suspended !'})
        
        if(user.thirdParty === null) {            
            const isValid = utils.validPassword(req.body.password, user.password, user.salt)
            const {_doc: { password :notToSendPassword, salt :notToSendSalt, ...userInfoToSend }} = user
            console.log(isValid)
            if(isValid) {
                const tokenObject = utils.issueJWT(user)
                
                // Get a reference to the Firebase Messaging instance
                const messaging = admin.messaging()
            
                // Subscribe the user to the topic
                messaging.subscribeToTopic(req.body.notiToken, 'all')
                    .then(async () => {
                        const notiData = {
                            token: req.body.notiToken
                        }
                        const isNotiDataAlreadyExist =  await userModel.findById(user._id)
                        if(isNotiDataAlreadyExist.notiData) {
                            await pushNotiModel.updateOne({_id: isNotiDataAlreadyExist.notiData}, {$set: notiData}, {new: true})
                        } else {
                            const pushNotiData = await pushNotiModel.create(notiData)
                            await userModel.updateOne({_id: ObjectId(user._id)}, {$set: {notiData: pushNotiData}}, {new: true})
                        }
                        console.log(`Successfully subscribed to topic: ${'all'}`)
                    })
                    .catch((error) => {
                        console.log(`Error subscribing to topic: ${error}`)
                    })
    
                return res.status(200).json({success: true, user: user, token: tokenObject.token, expires: tokenObject.expires})
            } else {
                return res.status(401).json({ success: false, msg: 'You entered the wrong password !'})
            }
        } else {
            return res.status(400).json({success: false, msg: `You have to login with ${user.thirdParty} !`})
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message})
    }
}

const dashboardLogin = async  (req, res, next) => {
    try {
        const user = await userModel.findOne({ email: req.body.email })
        if(!user) 
            return res.status(401).json({success: false, msg: 'Could not find the user!'})
    
        // saving history
        const history = new historyModel({
            name: user.name,
            role: user.role,
            email: user.email,
            action: 'Login',
            message: `Login user called ${user.name}`
        })
        await history.save()
    
        let todayDate = new Date()
        const duration = todayDate - user.packageExpiresAt
        if(duration > 0) {
            let updatesData = {
                premium: false,
                package: null,
                packageStartDate: new Date(),
                packageExpiresAt: new Date(),
            }
            await userModel.updateOne({_id: ObjectId(user._id)}, {$set: updatesData}, {new: true})
        }
        
        if(user.status === 'suspended') 
            return res.status(404).json({success: false, msg: 'You are account is temporarily suspended !'})
        
        if(user.thirdParty === null) {            
            const isValid = utils.validPassword(req.body.password, user.password, user.salt)
            const {_doc: { password :notToSendPassword, salt :notToSendSalt, ...userInfoToSend }} = user
    
            if(isValid) {
                const tokenObject = utils.issueJWT(user)
                return res.status(200).json({success: true, data: user, token: tokenObject.token, expires: tokenObject.expires})
            } else {
                return res.status(401).json({ success: false, msg: 'You entered the wrong password !'})
            }
        } else {
            return res.status(400).json({success: false, msg: `You have to login with ${user.thirdParty} !`})
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message})
    }
}

const loginSuccess = async (req, res) => {
    try {
        if(req.user) {
            const user = await userModel.findOne({thirdPartyId: req.user.data.thirdPartyId})
    
            if(user.status === 'suspended') {
                res.cookie("session", "", {
                    httpOnly: true, 
                    secure: true,
                    sameSite: "none",    
                    expires: new Date(1)
                })
                return res.status(404).json({success: false, msg: 'You are account is temporarily suspended !'})
            }
            
            // saving history
            const history = new historyModel({
                name: user.name,
                role: user.role,
                email: user.email,
                action: 'Login',
                message: `Login user called ${user.name}`,
            })
            await history.save()
            let todayDate = new Date()
            const duration = todayDate - user.packageExpiresAt
            if(duration > 0) {
                let updatesData = {
                    premium: false,
                    package: null,
                    packageStartDate: new Date(),
                    packageExpiresAt: new Date(),
                }
                await userModel.updateOne({_id: ObjectId(user._id)}, {$set: updatesData}, {new: true})
            }


            // Get a reference to the Firebase Messaging instance
            const messaging = admin.messaging()

            // Subscribe the user to the topic
            messaging.subscribeToTopic(req.body.token, 'all')
                .then(async () => {
                    const notiData = {
                        deviceId: req.body.deviceId,
                        token: req.body.token
                    }
                    const isNotiDataAlreadyExist =  await userModel.findOne({thirdPartyId: req.user.thirdPartyId})
                    if(isNotiDataAlreadyExist.notiData) {
                        await pushNotiModel.updateOne({_id: isNotiDataAlreadyExist.notiData}, {$set: notiData}, {new: true})
                    } else {
                        const pushNotiData = await pushNotiModel.create(notiData)
                        await userModel.updateOne({thirdPartyId: req.user.thirdPartyId}, {$set: {notiData: pushNotiData}}, {new: true})
                    }
                    console.log(`Successfully subscribed to topic: ${'all'}`)
                })
                .catch((error) => {
                    console.log(`Error subscribing to topic: ${error}`)
                })
        
            return res.status(200).json({ success: true, user: req.user })
        } else {
            return res.status(401).json({
                success: false,
                msg: 'Not authorize !',
            })
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            msg: error.message,
        })
    }
}

const thirdPartyLogout = async (req, res) => {  
    res.cookie("session", "", {
        httpOnly: true, 
        secure: true,
        sameSite: "none",    
        expires: new Date(1)
    })
    res.redirect(process.env.CLIENT_URI)
}

const loginFailed = async (req, res) => {
    // saving history
    const history = new historyModel({
        name: user.name,
        role: user.role,
        email: user.email,
        action: 'logout',
        message: ""
    })
    await history.save()
    res.status(401).json({
        success: false,
        msg: 'Authorization failed !',
    })
}


module.exports = { register, login, checkEmail, dashboardLogin, loginSuccess, thirdPartyLogout, loginFailed }