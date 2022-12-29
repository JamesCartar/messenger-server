const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
const emailModel = require('../models/Email.js');

const addEmail = async (req, res, next) => {

    try {
        if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
            const isAlreadyExist = await emailModel.findOne({authUser: req.body.authUser});
            if(isAlreadyExist) return res.status(403).json({success: true, msg: `Email setting already exist !`});

            const emailSetting = await emailModel.create(req.body);
            res.status(200).json({success: true, msg: `Email settting with the user name of ${emailSetting.authUser} has been added successfully !`});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};


const getEmail = async (req, res, next) => {

    try {
        if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
            const email = await emailModel.findOne({});
            if(email) 
                return res.status(200).json({success: true, email: email});
                
            res.status(404).json({success: false, msg: 'No email setting !'})
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, msg: error.message}); 
    }
   
};


const updateEmail = async (req, res, next) => {

    const whoIsUpdatingEmailSetting = await userModel.findById(req.jwt.sub);
    try {
        if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
            const updatesData = req.body;
            const updatingEmailSetting = await emailModel.findOneAndUpdate({}, {$set: updatesData}, {new: true});
            
            if(updatingEmailSetting.modifiedCount < 1) return res.status(404).json({success: false, msg: `Updating email setting failed please try again later !`}); 
            const updatedEmail = await emailModel.findOne({});
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingEmailSetting.name,
                role: whoIsUpdatingEmailSetting.role,
                email: whoIsUpdatingEmailSetting.email,
                action: `Updating Email Setting`,
                message: `Updating email setting called ${updatingEmailSetting.title}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Email setting has been updated !`});

        } else {
            return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message}) 
    }
};



module.exports = { addEmail, getEmail, updateEmail };