const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
const googleModel = require('../models/Google.js');

const addGoogle = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});

    try {
        if(userRole.role === 'super admin' || userRole.role === 'admin') {
            const isAlreadyExist = await googleModel.findOne({accessKeyId: req.body.accessKeyId});
            if(isAlreadyExist) return res.status(403).json({success: true, msg: `Google setting already exist !`});

            const googleSetting = await googleModel.create(req.body);
            res.status(200).json({success: true, msg: `Google settting with the access key id of ${googleSetting.accessKeyId} has been added successfully !`});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};


const getGoogle = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});

    if(userRole.role === 'super admin' || userRole.role === 'admin') {
        try {
            const googleSetting = await googleModel.findOne({});
            if(googleSetting) 
                return res.status(200).json({success: true, googleSetting: googleSetting});
                
            res.status(404).json({success: false, msg: 'No google setting !'})
            
        } catch (error) {
            console.log(error);
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};


const updateGoogle = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    const whoIsUpdatingGoogleSetting = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});


    if(userRole.role === 'super admin' || userRole.role === 'admin') {
        const updatesData = req.body;
        try {
            const updatingGoogleSetting = await googleModel.findOneAndUpdate({}, {$set: updatesData}, {new: true});
           
            if(updatingGoogleSetting.modifiedCount < 1) return res.status(404).json({success: false, msg: `Updating google setting failed please try again later !`}); 
            const updatedGoogleSetting = await googleModel.findOne({});
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingGoogleSetting.name,
                role: whoIsUpdatingGoogleSetting.role,
                email: whoIsUpdatingGoogleSetting.email,
                action: `Updating Google Setting`,
                message: `Updating google setting.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Google setting has been updated !`});
        } catch (error) {
          res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};



module.exports = { addGoogle, getGoogle, updateGoogle };