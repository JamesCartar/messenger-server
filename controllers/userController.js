if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
let { ObjectId } = require('mongodb');
const utils = require('../utils/passwordUtils.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
const emailModel = require('../models/Email.js');
const sendEmailUtils = require("../utils/sendEmailUtils.js");


const getAllUsers = async (req, res, next) => {
    const {sub, role} = req.jwt;
    if(!role) return res.status(401).json({success: false, msg: "You are not allowed to visit this route sssss!"})
    const userRole = await roleModel.findOne({role: role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overUser;

    if(permissions.getUser) {
        const userPerPage = req.query.userPerPage
        ? parseInt(req.query.userPerPage, 10)
        : 20;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        let filters = {};
        let sortString = "createdAt";
        let descendingOrDecending = 1;

        if (req.query.name) {
            filters = { $text: { $search: req.query.name } };
        } else if (req.query.role) {
            filters = { role: { $eq: req.query.role } };
        } else if (req.query.email) {
            filters = { email: { $eq: req.query.email } };
        } else if (req.query.phone) {
            filters = { phone: { $eq: req.query.phone } };
        } else if (req.query.startDate) {
            filters.createdAt = {
                $gt: new Date(req.query.startDate).toISOString()
            }
        } else if (req.query.endDate) {
            filters.createdAt = {
                $lt: new Date(req.query.endDate).toISOString()
            }
        } else if (req.query.startDate && req.query.endDate) {
            filters.createdAt = {
                $gt:  new Date(req.query.startDate).toISOString(),
                $lt:  new Date(req.query.endDate).toISOString()
            }
        }

        switch(req.query.sort) {
            case 'a_to_z':
                sortString = "name";
                descendingOrDecending = 1;
                break;
            case 'z_to_a':
                sortString = "name";
                descendingOrDecending = -1;
                break;
            case 'createdAt':
                sortString = 'createdAt';
                descendingOrDecending = -1;
                break;
            case 'updatedAt':
                sortString = 'updatedAt';
                descendingOrDecending = -1;
        }
        
        try {
            const users = await userModel.find();
            const foundUsers = await userModel.find(filters).limit(userPerPage).skip(userPerPage * page).sort({[sortString]: descendingOrDecending});
            const usersToSend = foundUsers.map((user) => ({
                id: user._id,
                fullName: user.name,
                password: user.password,
                role: user.role,
                dob: user.dob,
                premium: user.premium,
                addOn: user.addOn || false,
                username: user.email.split('@')[0],
                country: 'El Salvador',
                contact: user.phone,
                email: user.email,
                currentPlan: user.package || '',
                status: user.status,
                avatar: user.profileImage
            }));

            res.status(200).json({success: true, total_results: users.length, found_results: usersToSend.length, page: page, entries_per_page: userPerPage, users: usersToSend})
        } catch (error) {
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to see all users!'})
    }
};

const addUser = async (req, res, next) => {
    const whoIsAddingUser = await userModel.findById(req.jwt.sub);
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overUser;
    
    try {
        if(permissions.createUser) {
            const user = await userModel.findOne({ email: req.body.email });
            if(user) {
                return res.status(409).json({success: false, msg: 'User already exists!'})
            } else {
                const saltHash = utils.genPassword(req.body.password);
                req.body.salt = saltHash.salt;
                req.body.password = saltHash.hash;
                
                const newUser = await userModel.create(req.body);
                const jwt = utils.issueJWT(newUser);

                var transport = await sendEmailUtils();
                const emailSetting = await emailModel.findOne({});
                //   send mail with defined transport object
                await transport.sendMail({
                    from: `"ethicaldigit" ${emailSetting.authUser}`,
                to: newUser.email,
                subject: "Sending account information",
                html: `
                    <p><b>Hi ${newUser.name},</b></p>
                    <p>We have created an account for you.</p>
                    <p>This is the account informations:</p>
                    <p>name: <strong>${newUser.name}</strong></p>
                    <p>email: <strong>${newUser.email}</strong></p>
                    <p>password: <strong>${req.body.password}</strong></p>
                    <i>You have to enter the email and password to login.</i>
                `,
                });
                // saving history
                const history = new historyModel({
                    name: whoIsAddingUser.name,
                    role: whoIsAddingUser.role,
                    email: whoIsAddingUser.email,
                    action: `Adding User`,
                    message: `Adding user with the email of ${newUser.email}.`,
                });
                await history.save();
                
                const {_doc: { salt: notToSendSalt, password: notToSendPassword, ...userInfoToSend }} = newUser;
                return res.status(201).json({ success: true, msg: `User with the email of ${newUser.email} has been created successfully !`});
            }
        } else {
            res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }  
    } catch (error) {
        console.log(error)
        res.status(500).json({success: false, msg: error.message});
    }


};



const getUser = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overUser;

    try {
        if(permissions.getUser) {
            const user = await userModel.findById(req.params.id);
            
            if(!user) return res.status(403).json({success: false, msg: `There is no user with the id of ${req.params.id}`});

            const {_doc: { hash, salt, ...userInfoToSend }} = user;
            return res.status(200).json({success: true, user: userInfoToSend});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
};

const adminUpdateUser = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsUpdatingUser = await userModel.findById(req.jwt.sub);

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overUser;

    if(permissions.updateUser) {
        if(req.body.password) {
            const saltHash = utils.genPassword(req.body.password);
            req.body.salt = saltHash.salt;
            req.body.password = saltHash.hash;
        }
        const updatesData = req.body;

        try {
            const updatingUser = await userModel.updateOne({_id: ObjectId(req.params.id)}, {$set: updatesData}, {new: true});

            if(updatingUser.modifiedCount < 1) return res.status(404).json({success: false, msg: `There is no user with the id of ${req.params.id} !`}); 
            const updatedUser = await userModel.findById(req.params.id);
            
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingUser.name,
                role: whoIsUpdatingUser.role,
                email: whoIsUpdatingUser.email,
                action: `Updating User`,
                message: `Updating user with the email of ${updatedUser.email}.`
            });
            await history.save();
            return res.status(201).json({success: true, msg: `User with the id of ${req.params.id} has been updated !`});
        } catch (error) {
            console.log(error)
          res.status(500).json({success: false, msg: error.message});  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};


const updateUser = async (req, res, next) => {
    const whoIsUpdatingUser = await userModel.findById(req.jwt.sub);
    
    if(whoIsUpdatingUser) {
        let isValid;
        if(req.body.oldPassword) {
            isValid = utils.validPassword(req.body.oldPassword, whoIsUpdatingUser.password, whoIsUpdatingUser.salt);
            if(isValid) {
                const saltHash = utils.genPassword(req.body.password);
                req.body.salt = saltHash.salt;
                req.body.password = saltHash.hash;
            } else {
                return res.status(403).json({success: false, msg: 'You have enter the wrong password !'})
            }
        }
        const updatesData = req.body;

        try {
            const updatingUser = await userModel.updateOne({_id: ObjectId(req.params.id)}, {$set: updatesData}, {new: true});

            if(updatingUser.modifiedCount < 1) return res.status(404).json({success: false, msg: `There is no user with the id of ${req.params.id} !`}); 
            const updatedUser = await userModel.findById(req.params.id);
            
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingUser.name,
                role: whoIsUpdatingUser.role,
                email: whoIsUpdatingUser.email,
                action: `Updating User`,
                message: `Updating user with the email of ${updatedUser.email}.`
            });
            await history.save();
            return res.status(201).json({success: true, msg: `User with the id of ${req.params.id} has been updated !`});
        } catch (error) {
            console.log(error)
          res.status(500).json({success: false, msg: error.message});  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const deleteUser = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingUser = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overUser;

    if(permissions.deleteUser) {
        try {
            const userToDelete = await userModel.findById(req.params.id);
            if(userToDelete) {
                await userModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingUser.name,
                    role: whoIsDeletingUser.role,
                    email: whoIsDeletingUser.email,
                    action: `Deleting User`,
                    message: `Deleting user with the id of ${req.params.id}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `User with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `User with the id of ${req.params.id} does not exist !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};


module.exports = { getAllUsers, getUser, addUser, adminUpdateUser, updateUser, deleteUser };