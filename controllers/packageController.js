let { ObjectId } = require('mongodb');

const packageModel = require('../models/Package.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');

const getAllPackage = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    let filters = {};
    if (req.query.name) {
        filters = { $text: { $search: req.query.name } };
    } else if(req.query.month) {
        filters = { $text: { $search: req.query.month } };
    } else if(req.query.price) {
        filters = { $text: { $search: req.query.price } };
    }

    let sortString;
    let descendingOrDecending;
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

    const permissions = userRole.permissions.overPackage;
    if(permissions.getPackage) {
        try {
            const packages = await packageModel.find(filters).sort({[sortString]: descendingOrDecending});;
            return res.status(200).json({success: true, packages: packages});
        } catch (error) {
            console.log(error)
            return res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const addPackage = async (req, res, next) => {
    const { name, month, price, description } = req.body;
    if(!name || !month || !price || !description) return res.status(403).json({success: false, msg: 'Please provide all the necessity fields !'});

    try {    
        const userRole = await roleModel.findOne({role: req.jwt.role});
    
        const whoIsAddingPackage = await userModel.findById(req.jwt.sub);
        if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});

        const permissions = userRole.permissions.overPackage;
        if(permissions.createPackage) {
            const oldPackage = await packageModel.findOne({name: name});
            if(oldPackage) return res.status(403).json({success: false, msg: 'Package already exist !'})

            const package = new packageModel(req.body);
            const savedPackage = await package.save();
            // saving history
            const history = new historyModel({
                name: whoIsAddingPackage.name,
                role: whoIsAddingPackage.role,
                email: whoIsAddingPackage.email,
                action: `Adding Package`,
                message: `Adding package called ${savedPackage.name}.`,
            });
            await history.save();
            res.status(201).json({success: true, msg: `Package with the name of ${savedPackage.name} has been added to the database !`})
        } else {
            res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }


}

const getPackage = async (req, res, next) => {    
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overPackage;

    try {
        if(permissions.getPackage) {
            const package = await packageModel.findById(req.params.id);
            if(!package) return res.status(403).json({success: false, msg: `There is not package with the id of ${req.params.id}`});

            return res.status(200).json({success: true, package: package});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
}

const updatePackage = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    const whoIsUpdatingPackage = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overPackage;

    if(permissions.updatePackage) {
        const updatesData = req.body;

        try {
            const updatingPackage = await packageModel.updateOne({_id: ObjectId(req.params.id)}, {$set: updatesData}, {new: true});
           
            if(updatingPackage.modifiedCount < 1) return res.header("Access-Control-Allow-Methods", "PATCH").status(404).json({success: false, msg: `There is no package with the id of ${req.params.id} !`}); 
            const updatedPackage = await packageModel.findById(req.params.id);
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingPackage.name,
                role: whoIsUpdatingPackage.role,
                email: whoIsUpdatingPackage.email,
                action: `Updating Package`,
                message: `Updating package called ${updatedPackage.name}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Package with the id of ${req.params.id} has been updated !`});
        } catch (error) {
          res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const deletePackage = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingPackage = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overPackage;

    if(permissions.deletePackage) {
        try {
            const packageToDelete = await packageModel.findById(req.params.id);

            if(packageToDelete) {
                await packageModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingPackage.name,
                    role: whoIsDeletingPackage.role,
                    email: whoIsDeletingPackage.email,
                    action: `Deleting Package`,
                    message: `Deleting package with the id of ${req.params.id}`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `package with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `package with the id of ${req.params.id} does not  exist !`})
            }
        } catch (error) {
            res.status(500).json({success: false, msg: error.message});
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};


const purchase = async (req, res, next) => {
    const { packageId, userId } = req.body;
    if(!packageId || !userId) return res.status(404).json({success: false, msg: "Please provide all the necessity fields !"});

    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsPurchasingPackage = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overPackage;

    if(permissions.purchasePackage) {
        try {
            const package = await packageModel.findById(packageId);
            const user = await userModel.findById(userId);
            const todayDate = new Date();
            Date.prototype.addDays = function(days) {
                this.setDate(this.getDate() + parseInt(days));
                return this;
            };
            

            if(user.packageExpiresAt && user.premium) {
                const duration = todayDate - user.packageExpiresAt;

                if(duration > 0) {
                   await firstTimePurchase(todayDate, package, userId);
                } else {
                    let startDate = user.packageExpiresAt;
                    const Olduser = await userModel.findById(userId);

                    const newDate = startDate.addDays(Number(package.month) * 30);
                    let updatesData = {
                        premium: true,
                        package: package.name,
                        packageStartDate: Olduser.packageExpiresAt,
                        packageExpiresAt: newDate,
                    };
                    await userModel.updateOne({_id: ObjectId(userId)}, {$set: updatesData}, {new: true});
                }
            } else {
                await firstTimePurchase(todayDate, package, userId);
            }
            // saving history
            const history = new historyModel({
                name: whoIsPurchasingPackage.name,
                role: whoIsPurchasingPackage.role,
                email: whoIsPurchasingPackage.email,
                action: `Purchasing Package`,
                message: `Purchasing package called ${package.name}.`,
            });
            await history.save();
            res.status(200).json({success: true, msg: 'Purchase successful !'});
        } catch (error) {
            console.log(error);
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

async function firstTimePurchase(nowDate, package, userId) {
    const endDate = nowDate.addDays(Number(package.month) * 30);
    
    let updatesData = {
        premium: true,
        package: package.name,
        packageStartDate: new Date(),
        packageExpiresAt: endDate,
    };
    await userModel.updateOne({_id: ObjectId(userId)}, {$set: updatesData}, {new: true});
};

const cancel = async (req, res, next) => {
    const { userId } = req.body;
    if(!userId) return res.status(404).json({success: false, msg: "Please provide all the necessity fields !"});
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsCancelingPackage = await userModel.findById(req.jwt.sub);
    if(!userRole || !whoIsCancelingPackage) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overPackage;
    
    try { 
        if(permissions.cancelPackage) {
            let updatesData = {
                premium: false,
                package: null,
                packageStartDate: new Date(),
                packageExpiresAt: new Date(),
            };
            const oldUser = await userModel.findOne({_id: ObjectId(userId)});
            if(!oldUser) return res.status(404).json({success: false, msg: `There is no user with ${userId}`});
            await userModel.updateOne({_id: ObjectId(userId)}, {$set: updatesData}, {new: true});
            
            // saving history
            const history = new historyModel({
                name: whoIsCancelingPackage.name,
                role: whoIsCancelingPackage.role,
                email: whoIsCancelingPackage.email,
                action: `Canceling Package`,
                message: `Canceling package of the user id of ${userId} successful.`,
            });
            await history.save();
            res.status(200).json({success: true, msg: "you have successfully cancel !"});
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, msg: error.message})  
    }
};



module.exports = { getAllPackage, addPackage, getPackage, updatePackage, deletePackage, purchase, cancel };