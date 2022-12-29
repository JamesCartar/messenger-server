const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');


const getAllHistory = async (req, res, next) => { 
    
    try {    
        if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
            const historyPerPage = req.query.historyPerPage
            ? parseInt(req.query.historyPerPage, 10)
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
            } else if (req.query.action) {
                filters = { action: { $eq: req.query.action } };
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
            const history = await historyModel.find();
            const foundHistory = await historyModel.find(filters).limit(historyPerPage).skip(historyPerPage * page).sort({[sortString]: descendingOrDecending});
            return res.status(200).json({success: true, total_results: history.length, found_results: foundHistory.length, page: page, entries_per_page: historyPerPage, history: foundHistory})
        
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({success: false, msg: error.message});
    };
};

const getHistory = async (req, res, next) => {
    
    try {
        if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
            const history = await historyModel.findById(req.params.id);
            
            if(!history) return res.status(403).json({success: false, msg: `There is no history with the id of ${req.params.id}`});

            return res.status(200).json({success: true, history: history});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
};

const deleteHistory = async (req, res, next) => {
    
    const whoIsDeletingHistory = await userModel.findById(req.jwt.sub);
    if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
        try {
            const historyToDelete = await historyModel.findById(req.params.id);
            if(historyToDelete) {
                await historyModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingHistory.name,
                    role: whoIsDeletingHistory.role,
                    email: whoIsDeletingHistory.email,
                    action: `Deleting History`,
                    message: `deleting history with the id of ${req.params.id}.`
                });
                await history.save();
                res.status(200).json({success: true, msg: `history with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `history with the id of ${req.params.id} does not exist !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const clearHistory = async (req, res, next) => {
    
    const whoIsDeletingHistory = await userModel.findById(req.jwt.sub);
    if(req.jwt.sub === 'super admin' || req.jwt.sub === 'admin') {
        try {
            const historyToClear = await historyModel.find({});

            if(historyToClear.length > 0) {
                await historyModel.deleteMany();
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingHistory.name,
                    role: whoIsDeletingHistory.role,
                    email: whoIsDeletingHistory.email,
                    action: `Clearing History`,
                    message: `Clearing all history.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `history has been clear successfully !`})
            } else {
                res.status(404).json({success: false, msg: `There is nothing to clear !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

module.exports = { getAllHistory, getHistory, deleteHistory, clearHistory };