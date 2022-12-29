if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const utils = require('../utils/passwordUtils.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const notificationModel = require('../models/Notification.js');
const historyModel = require('../models/History.js');
let { ObjectId } = require('mongodb');

const getAllNotifications = async (req, res, next) => {

    if(permissions.getNotification) {
        try {
            const notifications = await notificationModel.find({});
            res.status(200).json({success: true, notifications: notifications});
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}


const getNotification = async (req, res, next) => {

    if(permissions.getNotification) {
        try {
            const notifications = await notificationModel.findById(req.params.id);
            res.status(200).json({success: true, notification: notifications});
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}


const addNotification = async (req, res, next) => {
    
    if(permissions.createNotification) {
        try {        
            const isAlreadyExist = await notificationModel.findOne({subject: req.body.subject});
            if(isAlreadyExist) 
                return res.status(409).json({success: false, msg: 'Notificaion already exists!'});

            const newNoti = await notificationModel.create(req.body);
            res.status(200).json({success: true, msg: `Notification called ${newNoti.subject} has been created !`})
        } catch (error) {
            res.status(500).json({success: false, msg: error.message});
        }

    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}


const updateNotification = async (req, res, next) => {
    
    const whoIsUpdatingNotification = await userModel.findById(req.jwt.sub);
    if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
        const updatesData = req.body;
        try {
            const updatingNotification = await notificationModel.updateOne({_id: ObjectId(req.params.id)}, {$set: updatesData}, {new: true});
           
            if(updatingNotification.modifiedCount < 1) return res.status(404).json({success: false, msg: `There is no notification with the id of ${req.params.id} !`}); 
            const updatedNotification = await notificationModel.findById(req.params.id);
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingNotification.name,
                role: whoIsUpdatingNotification.role,
                email: whoIsUpdatingNotification.email,
                action: `Updating Notification`,
                message: `Updating notification the ${updatedNotification.subject}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Notification with the id of ${req.params.id} has been updated !`});
        } catch (error) {
          res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}


module.exports = { getAllNotifications, addNotification, getNotification, updateNotification };