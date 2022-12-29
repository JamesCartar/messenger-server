const videoBookModel = require('../models/VideoBook.js');
const favoriteModel = require('../models/Favorite.js');
const downloadModel = require('../models/Download.js');
const mp4Model = require('../models/Mp4.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
let { ObjectId } = require('mongodb');

const { s3Uploadv2 } = require('../config/aws.js');
const { S3 } = require('aws-sdk');

const getAllVideoBooks = async (req, res, next) => {
    const {sub, role} = req.jwt;
    if(!role) return res.status(401).json({success: false, msg: "You are not allowed to visit this route sssss!"})
    const userRole = await roleModel.findOne({role: role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;

    if(permissions.getVideo) {
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
            const audiobooks = await videoBookModel.find();
            const foundAudioBooks = await videoBookModel.find(filters).limit(audioBookPerPage).skip(audioBookPerPage * page).sort({[sortString]: descendingOrDecending}).populate('mp4');

            res.status(200).json({success: true, total_results: audiobooks.length, found_results: foundAudioBooks.length, page: page, entries_per_page: audioBookPerPage, audioBooks: foundAudioBooks})
        } catch (error) {
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to see all users!'})
    }

}

const addVideoBook = async (req, res, next) => {
    const whoIsAddingVideoBook = await userModel.findById(req.jwt.sub);
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;
    try {
        if(permissions.createVideo) {
            const videoBook = await videoBookModel.findOne({ title: req.body.title });
            if(videoBook) {
                return res.status(409).json({success: false, msg: 'Video book already exists!'})
            } else {
                const awsResponse = await s3Uploadv2(req.file);
                const mp4 = await mp4Model.create({file: awsResponse.Location, summary: req.body.summary});
                req.body.mp4 = mp4._id;
                const category = req.body.category.split(',');
                req.body.category = category;
    
                const newVideoBook = await videoBookModel.create(req.body);
                const history = new historyModel({
                    name: whoIsAddingVideoBook.name,
                    role: whoIsAddingVideoBook.role,
                    email: whoIsAddingVideoBook.email,
                    action: `Adding Video Book`,
                    message: `Adding video book with the title of ${newVideoBook.title}.`,
                });
                await history.save();
                return res.status(201).json({ success: true, msg: `Video book with the title of ${newVideoBook.title} has been added successfully !`});
            }
        } else {
            return res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message});
    } 
}

const getVideoBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;

    try {
        if(permissions.getVideo) {
            const videoBook = await videoBookModel.findById(req.params.id).populate('mp4');
            if(!videoBook) return res.status(403).json({success: false, msg: `There is no audio book with the id of ${req.params.id}`});

            return res.status(200).json({success: true, videoBook: videoBook});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
}

const updateVideoBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});

    const whoIsUpdatingVideoBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;

    if(permissions.updateVideo) {        
        let videoBookToUpdate = await bookModel.findById(req.params.id);  
        const updatesData = req.body;
        if(req.body.category) {
            const category = req.body.category.split(',');
            updatesData.category = category;
        }
        if(req.file) {
            const awsResponse = await s3Uploadv2(req.file);
            await videoBookModel.updateOne({_id: ObjectId(videoBookToUpdate.mp4)}, {$set: {file: awsResponse.Location}}, {new: true});
        }

        try {
            const updatingVideoBook = await videoBookModel.updateOne({_id: ObjectId(req.params.id)}, {$set: updatesData}, {new: true});
            if(updatingVideoBook.modifiedCount < 1) 
                return res.status(404).json({success: false, msg: `There is no video book with the id of ${req.params.id} !`}); 

            // saving history
            const history = new historyModel({
                name: whoIsUpdatingVideoBook.name,
                role: whoIsUpdatingVideoBook.role,
                email: whoIsUpdatingVideoBook.email,
                action: `Updating Video Book`,
                message: `Updating video book called ${updatingVideoBook.title}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Video book with the id of ${req.params.id} has been updated !`});
        } catch (error) {
          res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const deleteVideoBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingVideoBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;
    
    if(permissions.deleteVideo) {
        try {
            const videoBookToDelete = await videoBookModel.findById(req.params.id);
            if(videoBookToDelete) {
                const mp4ToDelete = await mp4Model.findById(videoBookToDelete.mp3);
                const s3 = new S3();
                let params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `uploads/${mp4ToDelete.file.split('uploads/')[1]}`
                };
                await s3.deleteObject(params, function(err, data) {
                    if(err) {
                        console.log(err);
                    }
                    console.log(data)
                }).promise();

                await mp4Model.findByIdAndDelete(videoBookToDelete.mp3);


                await videoBookModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingVideoBook.name,
                    role: whoIsDeletingVideoBook.role,
                    email: whoIsDeletingVideoBook.email,
                    action: `Deleting Video Book`,
                    message: `Deleting video book with the id of ${req.params.id}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `Video book with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `Video book with the id of ${req.params.id} does not exist !`})
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
    const permissions = userRole.permissions.overVideo;

    try {
        if(permissions.updateVideo) {
            const favorite = await videoBookModel.findById(req.params.id);
            
            if(favorite.favorite.includes(req.jwt.sub)) {
                await videoBookModel.updateOne({ _id: req.params.id }, {
                    $pull: {
                        favorite: req.jwt.sub,
                    },
                });
                await favoriteModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { video: req.params.id } });
                return res.status(200).json({success: true, msg: `Successfully removed from favorite list !`});
            } else {
                await videoBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { favorite: req.jwt.sub} }, { new: true });

                const alreadyFavoriteObjExist = await favoriteModel.findOne({userId: req.jwt.sub});
                if(alreadyFavoriteObjExist) {
                    await favoriteModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { video: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        video: req.params.id
                    };
                    await favoriteModel.create(dataToSave);
                }
                return res.status(200).json({success: true, msg: `Successfully added to the favorite list !`})
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
    const permissions = userRole.permissions.overVideo;

    try {
        if(permissions.updateVideo) {
            const favorite = await videoBookModel.findById(req.params.id);
            
            if(favorite.download.includes(req.jwt.sub)) {

                await downloadModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { video: req.params.id } });

                const alreadyDownloadObjExist = await downloadModel.findOne({userId: req.jwt.sub});
                if(alreadyDownloadObjExist) {
                    await downloadModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { video: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        video: req.params.id
                    };
                    await downloadModel.create(dataToSave);
                }
                return res.status(200).json({success: true, msg: `Already added to the download list !`});
            } else {
                await videoBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { download: req.jwt.sub} }, { new: true });
                return res.status(200).json({success: true, msg: `Successfully add favorite the video book !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};

const read = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overVideo;

    try {
        if(permissions.updateVideo) {
            const favorite = await videoBookModel.findById(req.params.id);
            
            if(favorite.read.includes(req.jwt.sub)) {
                return res.status(200).json({success: true, msg: `Already add read the video book !`});
            } else {
                await videoBookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { read: req.jwt.sub} }, { new: true });
                return res.status(200).json({success: true, msg: `Successfully add read the video book !`})
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
    const permissions = userRole.permissions.overVideo;

    try {
        if(permissions.getVideo) {
            const categories = await videoBookModel.distinct('category');
            return res.status(200).json({success: true, categories: categories});
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
};




module.exports = { getAllVideoBooks, addVideoBook, getVideoBook, updateVideoBook, deleteVideoBook, favorite, download, read, getAllCategory };