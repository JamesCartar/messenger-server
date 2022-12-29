const bookModel = require('../models/Book.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
const favoriteModel = require('../models/Favorite.js');


const getAllfavorite = async (req, res, next) => {

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const favorites = await favoriteModel.find({userId: req.jwt.sub}).populate('book').populate('audio').populate('video').exec();
            res.status(200).json({success: true, favorites: favorites});
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const getfavorite = async (req, res, next) => {

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const favorites = await favoriteModel.findOne({userId: req.jwt.sub}).populate('book').populate('audio').populate('video').exec();

            const isThatBook = favorites.book.some((obj) => obj._id.equals(req.params.id));
            const isThatVideo = favorites.video.some((obj) => obj._id.equals(req.params.id));
            const isThatAudio = favorites.audio.some((obj) => obj._id.equals(req.params.id));
            
            if(!isThatBook && !isThatVideo && !isThatAudio) 
                return res.status(403).json({success: false, msg: `There is no favorite data with id of ${req.params.id}`});
            let dataToSend;
            if(isThatBook) {
                let updatedData = favorites.book.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            if(isThatVideo) {
                let updatedData = favorites.video.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            if(isThatAudio) {
                let updatedData = favorites.audio.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            res.status(200).json({success: true, favorite: dataToSend});
        } catch (error) {
            console.log(error);
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const addfavorite = async (req, res, next) => {
    const whoIsAddingfavorite = await userModel.findById(req.jwt.sub);

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        const favoriteObj = await favoriteModel.findOne({ userId: req.body.userId || req.jwt.sub });
        if(!favoriteObj) {
            const dataToSave = {
                userId: req.body.userId,
                [req.body.type]: [ req.body.favoriteId ]
            };
            const favoriteData = await favoriteModel.create(dataToSave);
            // saving history
            const history = new historyModel({
                name: whoIsAddingfavorite.name,
                role: whoIsAddingfavorite.role,
                email: whoIsAddingfavorite.email,
                action: `Adding favorite`,
                message: `Adding favorite with the id of ${req.body.favoriteId}.`,
            });
            await history.save();
            return res.status(200).json({success: true, msg: `Favorite with the id of ${req.body.favoriteId} has been added successfully !`});
        } else {
            const isAlreadyExist = favoriteObj[req.body.type].some((favorite) => {
                return favorite.equals(req.body.favoriteId)
            });
            if(isAlreadyExist) 
                return res.status(403).json({success: false, msg: `favorite with the id of ${req.body.favoriteId} already exist !`});

            const addfavorite = await favoriteModel.findOneAndUpdate(
                { userId: req.body.userId },
                { $push: { [req.body.type]: req.body.favoriteId } }, { new: true });
            // saving history
            const history = new historyModel({
                name: whoIsAddingfavorite.name,
                role: whoIsAddingfavorite.role,
                email: whoIsAddingfavorite.email,
                action: `Adding favorite`,
                message: `Adding favorite with the id of ${req.body.favoriteId}.`,
            });
            return res.status(200).json({success: true, msg: `favorite with the id of ${req.body.favoriteId} has been added successfully !`});
        }
    } else {
        res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const deleteAfavorite = async (req, res, next) => {
    const whoIsRemovingfavorite = await userModel.findById(req.jwt.sub);

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        const favoriteObj = await favoriteModel.findOne({ userId: req.jwt.sub }, { _id:0 });
        if(favoriteObj) {
            const isThatBook = favoriteObj.book.some((id) => id.equals(req.params.id));
            const isThatVideo = favoriteObj.video.some((id) => id.equals(req.params.id));
            const isThatAudio = favoriteObj.audio.some((id) => id.equals(req.params.id));
            if(!isThatBook && !isThatVideo && !isThatAudio) 
                return res.status(403).json({success: false, msg: `There is no favorite with id of ${req.params.id}`});

            if(isThatBook) {
                let updatedData = favoriteObj.book.filter(id => {
                    return id.toString() != req.params.id;
                });
                favoriteObj.book = updatedData;
            }
            if(isThatVideo) {
                let updatedData = favoriteObj.video.filter(id => {
                    return id.toString() != req.params.id;
                });
                favoriteObj.video = updatedData;
            }
            if(isThatAudio) {
                let updatedData = favoriteObj.audio.filter(id => {
                    return id.toString() != req.params.id;
                });
                favoriteObj.audio = updatedData;
            }
             // saving history
             const history = new historyModel({
                name: whoIsRemovingfavorite.name,
                role: whoIsRemovingfavorite.role,
                email: whoIsRemovingfavorite.email,
                action: `Deleting favorite`,
                message: `Deleting favorite with the id of ${req.params.id}.`,
            });
            await history.save();
            const Removingfavorite = await favoriteModel.updateOne({ userId: req.jwt.sub }, {$set: favoriteObj}, {new: true});
            
            res.status(200).json({success: true, msg: `Removing favorite successful !`})
        } else {
            res.status(403).json({success: false, msg: 'favorite list is clear !'})
        }
    } else {
        res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const clearfavorite = async (req, res, next) => {

    const whoIsClearingfavorite = await userModel.findById(req.jwt.sub);
    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const favoriteToClear = await favoriteModel.findOne({userId: req.jwt.sub});
            if(favoriteToClear) {
                await favoriteModel.findOneAndDelete({userId: req.jwt.sub});
                // saving history
                const history = new historyModel({
                    name: whoIsClearingfavorite.name,
                    role: whoIsClearingfavorite.role,
                    email: whoIsClearingfavorite.email,
                    action: `Clearing favorite`,
                    message: `Clearing favorite with the user id of ${req.jwt.sub}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `Clearing favorite successful !`})
            } else {
                res.status(404).json({success: false, msg: `favorite with the id of ${req.params.id} does not exist !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

module.exports = { getAllfavorite, getfavorite, clearfavorite };











        