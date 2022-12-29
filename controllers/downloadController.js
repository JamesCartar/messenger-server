const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
const downloadModel = require('../models/Download.js');


const getAllDownload = async (req, res, next) => {

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const downloads = await downloadModel.find({userId: req.jwt.sub}).populate('book').populate('audio').populate('video').exec();
            res.status(200).json({success: true, downloads: downloads});
        } catch (error) {
            console.log(error);
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const getDownload = async (req, res, next) => {

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const downloads = await downloadModel.findOne({userId: req.jwt.sub}).populate('book').populate('audio').populate('video').exec();

            const isThatBook = downloads.book.some((obj) => obj._id.equals(req.params.id));
            const isThatVideo = downloads.video.some((obj) => obj._id.equals(req.params.id));
            const isThatAudio = downloads.audio.some((obj) => obj._id.equals(req.params.id));
            
            if(!isThatBook && !isThatVideo && !isThatAudio) 
                return res.status(403).json({success: false, msg: `There is no download data with id of ${req.params.id}`});
            let dataToSend;
            if(isThatBook) {
                let updatedData = downloads.book.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            if(isThatVideo) {
                let updatedData = downloads.video.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            if(isThatAudio) {
                let updatedData = downloads.audio.filter(obj => {
                    return obj._id.toString() === req.params.id;
                });
                dataToSend = updatedData;
            }
            res.status(200).json({success: true, download: dataToSend});
        } catch (error) {
            console.log(error);
            res.status(500).json({success: false, msg: error.message}); 
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

const addDownload = async (req, res, next) => {

    const whoIsAddingDownload = await userModel.findById(req.jwt.sub);
    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        const downloadObj = await downloadModel.findOne({ userId: req.body.userId || req.jwt.sub });
        if(!downloadObj) {
            const dataToSave = {
                userId: req.body.userId,
                [req.body.type]: [ req.body.downloadId ]
            };
            const downloadData = await downloadModel.create(dataToSave);
            // saving history
            const history = new historyModel({
                name: whoIsAddingDownload.name,
                role: whoIsAddingDownload.role,
                email: whoIsAddingDownload.email,
                action: `Adding download`,
                message: `Adding download with the id of ${req.body.downloadId}.`,
            });
            await history.save();
            return res.status(200).json({success: true, msg: `Download with the id of ${req.body.downloadId} has been added successfully !`});
        } else {
            const isAlreadyExist = downloadObj[req.body.type].some((download) => {
                return download.equals(req.body.downloadId)
            });
            if(isAlreadyExist) 
                return res.status(403).json({success: false, msg: `Download with the id of ${req.body.downloadId} already exist !`});

            const addDownload = await downloadModel.findOneAndUpdate(
                { userId: req.body.userId },
                { $push: { [req.body.type]: req.body.downloadId } }, { new: true });
            // saving history
            const history = new historyModel({
                name: whoIsAddingDownload.name,
                role: whoIsAddingDownload.role,
                email: whoIsAddingDownload.email,
                action: `Adding Download`,
                message: `Adding download with the id of ${req.body.downloadId}.`,
            });
            return res.status(200).json({success: true, msg: `Download with the id of ${req.body.downloadId} has been added successfully !`});
        }
    } else {
        res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const deleteADownload = async (req, res, next) => {
    const whoIsRemovingDownload = await userModel.findById(req.jwt.sub);

    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        const downloadObj = await downloadModel.findOne({ userId: req.jwt.sub }, { _id:0 });
        if(downloadObj) {
            const isThatBook = downloadObj.book.some((id) => id.equals(req.params.id));
            const isThatVideo = downloadObj.video.some((id) => id.equals(req.params.id));
            const isThatAudio = downloadObj.audio.some((id) => id.equals(req.params.id));
            if(!isThatBook && !isThatVideo && !isThatAudio) 
                return res.status(403).json({success: false, msg: `There is no download with the id of ${req.params.id}`});

            if(isThatBook) {
                let updatedData = downloadObj.book.filter(id => {
                    return id.toString() != req.params.id;
                });
                downloadObj.book = updatedData;
            }
            if(isThatVideo) {
                let updatedData = downloadObj.video.filter(id => {
                    return id.toString() != req.params.id;
                });
                downloadObj.video = updatedData;
            }
            if(isThatAudio) {
                let updatedData = downloadObj.audio.filter(id => {
                    return id.toString() != req.params.id;
                });
                downloadObj.audio = updatedData;
            }                
            // saving history
            const history = new historyModel({
                name: whoIsRemovingDownload.name,
                role: whoIsRemovingDownload.role,
                email: whoIsRemovingDownload.email,
                action: `Deleting Download`,
                message: `Deleting download with the id of ${req.params.id}.`,
            });
            await history.save();
            const RemovingDownload = await downloadModel.updateOne({ userId: req.jwt.sub }, {$set: downloadObj}, {new: true});
            
            res.status(200).json({success: true, msg: `Removing Download successful !`})
        } else {
            res.status(403).json({success: false, msg: 'Download list is clear !'})
        }
    } else {
        res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const clearDownload = async (req, res, next) => {
    
    const whoIsClearingDownload = await userModel.findById(req.jwt.sub);
    if(req.jwt.role === 'super admin' || req.jwt.role === 'admin') {
        try {
            const downloadToClear = await downloadModel.findOne({userId: req.jwt.sub});
            if(downloadToClear) {
                await downloadModel.findOneAndDelete({userId: req.jwt.sub});
                // saving history
                const history = new historyModel({
                    name: whoIsClearingDownload.name,
                    role: whoIsClearingDownload.role,
                    email: whoIsClearingDownload.email,
                    action: `Clearing Download`,
                    message: `Clearing download with the user id of ${req.jwt.sub}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `Clearing download successful !`});
            } else {
                res.status(404).json({success: false, msg: `Download with the id of ${req.params.id} does not exist !`});
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message});
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};

module.exports = { getAllDownload, getDownload, clearDownload };





