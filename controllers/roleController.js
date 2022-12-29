if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const utils = require('../utils/passwordUtils.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
let { ObjectId } = require('mongodb');


const getAllRole = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    let filters = {};
    if (req.query.role) {
        filters = { $text: { $search: req.query.role } };
    }


    const permissions = userRole.permissions.overRole;
    if(permissions.getRole) {
        try {
            const roles = await roleModel.find(filters);
            res.status(200).json({success: true, roles: roles});
        } catch (error) {
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const addRole = async (req, res, next) => {
    
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsAddingRole = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overRole;

    try {
        if(permissions.createRole) {
            const role = await roleModel.findOne({ role: req.body.role });
            if(role) {
                return res.status(409).json({success: false, msg: 'Row already exists!'});
            } else {
                const newRole = new roleModel({ role: req.body.role, permissions: req.body.permissions });
                const roleInfo = await newRole.save();
                
                // saving history
                const history = new historyModel({
                    name: whoIsAddingRole.name,
                    role: whoIsAddingRole.role,
                    email: whoIsAddingRole.email,
                    action: `Adding Role`,
                    message: `Adding role called ${roleInfo.role}.`
                });
                await history.save();
                return res.status(201).json({ success: true, msg: `Role called "${roleInfo.role}" has been added !`});   
            }
        } else {
            res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    } 
};



const getRole = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});

    const permissions = userRole.permissions.overRole;

    try {
        if(permissions.getRole) {
            const role = await roleModel.findById(req.params.id);
            if(!role) return res.status(404).json({success: false, msg: `Row with the id of ${req.params.id} does not exist !`});

            return res.status(200).json({success: true, role: role});
        } else {
            res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
}

const updateRole = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsUpdatingRole = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overRole;

    if(permissions.updateRole) {
        const dataToUpdate = req.body;
        const roleData =  await roleModel.findOne({_id: ObjectId(req.params.id)});

        if(dataToUpdate.permissions) {
            for(let permission in dataToUpdate.permissions) {
                if(permission.includes('User')) {
                    roleData.permissions.overUser[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Role')) {
                    roleData.permissions.overRole[permission] =  dataToUpdate.permissions[permission];
                } else if(permission.includes('Package')) {
                    roleData.permissions.overPackage[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('History')) {
                    roleData.permissions.overHistory[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Book')) {
                    roleData.permissions.overBook[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Audio')) {
                    roleData.permissions.overAudio[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Video')) {
                    roleData.permissions.overVideo[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('favorite')) {    
                    roleData.permissions.overfavorite[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Download')) {
                    roleData.permissions.overDownload[permission] = dataToUpdate.permissions[permission];
                } else if(permission.includes('Notification')) {
                    if(roleData.permissions.overNotification) {
                        roleData.permissions.overNotification[permission] = dataToUpdate.permissions[permission];
                    } else {
                        roleData.permissions.overNotification = {};
                        roleData.permissions.overNotification[permission] = dataToUpdate.permissions[permission];
                    }
                }
            }
        }
        if(dataToUpdate.role) {
            roleData.role = dataToUpdate.role;
        }
        try {
            const updatedRole = await roleModel.updateOne({_id: ObjectId(req.params.id)}, {$set: roleData}, {new: true});
            if(updatedRole.modifiedCount > 0) {
                
                // saving history
                const history = new historyModel({
                    name: whoIsUpdatingRole.name,
                    role: whoIsUpdatingRole.role,
                    email: whoIsUpdatingRole.email,
                    action: `Updating Role`,
                    message: `Updating role called ${roleData.role}.`
                });
                await history.save();
                res.status(200).json({ success: true, msg: `Role with the id of ${req.params.id} has been updated !` });
            } else {
                res.status(200).json({ success: false, msg: `There role with id of ${req.params.id} does not exist !` });
            }
        } catch(e) {
            console.log(e)
            return res.status(500).json({success: false, msg: e.message}); 
        }
    }
};



const deleteRole = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingRole = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allow to visit this route !'});

    const permissions = userRole.permissions.overRole;

    if(permissions.deleteRole) {
        try {
            const response = await roleModel.findByIdAndDelete(req.params.id);
            // saving history
            const history = new historyModel({
                name: whoIsDeletingRole.name,
                role: whoIsDeletingRole.role,
                email: whoIsDeletingRole.email,
                action: `Deleting Role`,
                message: `Deleting role with the id of ${req.params.id}.`
            });
            await history.save();
            if(response !== null) 
                return res.status(200).json({success: true, msg: `Role with the id of ${req.params.id} has been deleted!`});


            return res.status(404).json({success: false, msg: `Role with the id of ${req.params.id} does not exist !`})
        } catch (error) {
            res.status(500).json({success: false, msg: error.message});
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allow to visit this route !'});
    }
}


module.exports = { getAllRole, addRole, getRole, updateRole, deleteRole };



