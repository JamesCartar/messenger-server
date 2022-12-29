const audioBookModel = require('../models/AudioBook.js');
const favoriteModel = require('../models/Favorite.js');
const downloadModel = require('../models/Download.js');
const mp3Model = require('../models/Mp3.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
let { ObjectId } = require('mongodb');
const { S3 } = require("aws-sdk");
const { s3Uploadv2 } = require('../config/aws.js');

const getAllAudioBooks = async (req, res, next) => {
    const {sub, role} = req.jwt;
    if(!role) return res.status(401).json({success: false, msg: "You are not allowed to visit this route sssss!"})
    const userRole = await roleModel.findOne({role: role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    if(permissions.getAudio) {
        const audioBookPerPage = req.query.audioBookPerPage
        ? parseInt(req.query.audioBookPerPage, 10)
        : 20;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        let filters = {};
        let sortString = "createdAt";
        let descendingOrDecending = 1;

        if (req.query.title) {
            filters = { $text: { $search: req.query.title } };
        } else if (req.query.author) {
            filters = { author: { $eq: req.query.author } };
        }  else if (req.query.category) {
            filters = { category: {"$in": req.query.category} };
        } else if (req.query.free) {
            if(req.query.free === 'true') {
                filters = { free: { $eq: true } };
            } else if(req.query.free === 'false') {
                filters = { free: { $eq: false } };
            }
        } else if (req.query.rating) {
            filters.rating = {
                $gt: Number(req.query.rating)
            }
        } else if (req.query.download) {
            filters.download = {
                $gt: Number(req.query.download)
            }
        } else if (req.query.read) {
            filters.read = {
                $gt: Number(req.query.read)
            }
        } else if (req.query.favorite) {
            filters.favorite = {
                $gt: Number(req.query.favorite)
            }
        }

        switch(req.query.sort) {
            case 'a_to_z':
                sortString = "title";
                descendingOrDecending = 1;
                break;
            case 'z_to_a':
                sortString = "title";
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
            const audiobooks = await audioBookModel.find();
            const foundAudioBooks = await audioBookModel
                .find(filters)
                .limit(audioBookPerPage)
                .skip(audioBookPerPage * page)
                .sort({[sortString]: descendingOrDecending})
                .populate('mp3');

            res.status(200).json({
                success: true, 
                total_results: audiobooks.length, 
                found_results: foundAudioBooks.length, 
                page: page, 
                entries_per_page: audioBookPerPage, 
                audioBooks: foundAudioBooks
            })
        } catch (error) {
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to see all users!'})
    }
}

const addAudioBook = async (req, res, next) => {
    const whoIsAddingAudioBook = await userModel.findById(req.jwt.sub);
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;
    
    
    try {
        if(permissions.createAudio) {
            const audioBook = await audioBookModel.findOne({ title: req.body.title });
            console.log(audioBook)
            if(audioBook) {
                return res.status(409).json({success: false, msg: 'Audio book already exists!'});
            } else {
                const awsResponse = await s3Uploadv2(req.file);
                const mp3 = await mp3Model.create({file: awsResponse.Location, summary: req.body.summary});
                req.body.mp3 = mp3._id;
                const category = req.body.category.split(',');
                req.body.category = category;
    
                const newAudioBook = await audioBookModel.create(req.body);
                // saving history
                const history = new historyModel({
                    name: whoIsAddingAudioBook.name,
                    role: whoIsAddingAudioBook.role,
                    email: whoIsAddingAudioBook.email,
                    action: `Adding Audio Book`,
                    message: `Adding audio book with the title of ${newAudioBook.title}.`,
                });
                await history.save();
                return res.status(201).json({ success: true, msg: `Audio book with the title of ${newAudioBook.title} has been added successfully !`});
            }
        } else {
            return res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message});
    }

}

const getAudioBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    try {
        if(permissions.getAudio) {
            const audioBook = await audioBookModel.findById(req.params.id).populate('mp3');
            if(!audioBook) return res.status(403).json({success: false, msg: `There is no audio book with the id of ${req.params.id}`});

            return res.status(200).json({success: true, audioBook: audioBook});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
}

const updateAudioBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    const whoIsUpdatingAudioBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    if(permissions.updateAudio) {   
        let audioBookToUpdate = await audioBookModel.findById(req.params.id);     
        const updatesData = req.body;
        if(req.body.category) {
            const category = req.body.category.split(',');
            updatesData.category = category;
        }
        if(req.file) {
            const awsResponse = await s3Uploadv2(req.file);
            await mp3Model.updateOne({ _id: ObjectId(audioBookToUpdate.mp3) }, { $set: {file: awsResponse.Location} }, { new: true });
        }
        if(req.body.summary) {
            await mp3Model.updateOne({ _id: ObjectId(audioBookToUpdate.mp3) }, { $set: { summary: req.body.summary }}, { new: true })
        }

        try {
            const updatingAudioBook = await audioBookModel.updateOne({ _id: ObjectId(req.params.id) }, { $set: updatesData }, { new: true });
           
            if(updatingAudioBook.modifiedCount < 1) return res.status(404).json({success: false, msg: `There is no audio book with the id of ${req.params.id} !`}); 
            const updatedAudioBook = await audioBookModel.findById(req.params.id);
            // saving history
            const history = new historyModel({
                name: whoIsUpdatingAudioBook.name,
                role: whoIsUpdatingAudioBook.role,
                email: whoIsUpdatingAudioBook.email,
                action: `Updating Audio Book`,
                message: `Updating audio book called ${updatingAudioBook.title}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Audio book with the id of ${req.params.id} has been updated !`});
        } catch (error) {
          res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const deleteAudioBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingAudioBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    if(permissions.deleteAudio) {
        try {
            const audioBookToDelete = await audioBookModel.findById(req.params.id);
            if(audioBookToDelete) {
                const mp3ToDelete = await mp3Model.findById(audioBookToDelete.mp3);
                const s3 = new S3();
                let params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `uploads/${mp3ToDelete.file.split('uploads/')[1]}`
                };
                await s3.deleteObject(params, function(err, data) {
                    if(err) {
                        console.log(err);
                    }
                    console.log(data)
                }).promise();

                await mp3Model.findByIdAndDelete(audioBookToDelete.mp3);
                await audioBookModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingAudioBook.name,
                    role: whoIsDeletingAudioBook.role,
                    email: whoIsDeletingAudioBook.email,
                    action: `Deleting Audio Book`,
                    message: `Deleting audio book with the id of ${req.params.id}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `Audio book with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `Audio book with the id of ${req.params.id} does not exist !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
};


const favorite = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    try {
        if(permissions.updateAudio) {
            const favoriteObj = await audioBookModel.findById(req.params.id);

            if(favoriteObj.favorite.includes(req.jwt.sub)) {
                await audioBookModel.updateOne({ _id: req.params.id }, {
                    $pull: {
                        favorite: req.jwt.sub,
                    },
                });

                await favoriteModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { audio: req.params.id } });
                return res.status(200).json({success: true, msg: `Successfully remove from favorite list !`});
            } else {
                await audioBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { favorite: req.jwt.sub} }, { new: true });

                const alreadyFavoriteObjExist = await favoriteModel.findOne({userId: req.jwt.sub});
                if(alreadyFavoriteObjExist) {
                    await favoriteModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { audio: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        audio: req.params.id
                    };
                    await favoriteModel.create(dataToSave);
                }

                return res.status(200).json({success: true, msg: `Successfully add favorite the audio book !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};

const download = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    try {
        if(permissions.updateAudio) {
            const downloadAudio = await audioBookModel.findById(req.params.id);
            
            if(downloadAudio.download.includes(req.jwt.sub)) {

                await downloadModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { audio: req.params.id } });
                return res.status(200).json({success: true, msg: `Successfully removed from download list !`});
            } else {
                await audioBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { download: req.jwt.sub} }, { new: true });

                const alreadyDownloadObjExist = await downloadModel.findOne({userId: req.jwt.sub});
                if(alreadyDownloadObjExist) {
                    await downloadModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { audio: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        audio: req.params.id
                    };
                    await downloadModel.create(dataToSave);
                }
                return res.status(200).json({success: true, msg: `Successfully add download the audio book !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        console.log(error)
        res.status(500).json({success: false, msg: error.message});
    }
};

const read = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    try {
        if(permissions.updateAudio) {
            const favorite = await audioBookModel.findById(req.params.id);
            
            if(favorite.read.includes(req.jwt.sub)) {
                return res.status(200).json({success: true, msg: `Already add read the audio book !`});
            } else {
                await audioBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { read: req.jwt.sub} }, { new: true });
                return res.status(200).json({success: true, msg: `Successfully add read the audio book !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};



const getAllCategory = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overAudio;

    try {
        if(permissions.getAudio) {
            const categories = await audioBookModel.distinct('category');
            return res.status(200).json({success: true, categories: categories});
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};



module.exports = { getAllAudioBooks, addAudioBook, getAudioBook, updateAudioBook, deleteAudioBook, favorite, download, read, getAllCategory };