const bookModel = require('../models/Book.js');
const favoriteModel = require('../models/Favorite.js');
const downloadModel = require('../models/Download.js');
const pdfModel = require('../models/Pdf.js');
const userModel = require('../models/User.js');
const roleModel = require('../models/Role.js');
const historyModel = require('../models/History.js');
let { ObjectId } = require('mongodb');
const { S3 } = require("aws-sdk");
const { s3Uploadv2 } = require('../config/aws.js');

require('dotenv').config();

const getAllBooks = async (req, res, next) => {
    const {sub, role} = req.jwt;
    if(!role) return res.status(401).json({success: false, msg: "You are not allowed to visit this route sssss!"})
    const userRole = await roleModel.findOne({role: role});

    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    if(permissions.getBook) {
        const bookPerPage = req.query.bookPerPage
        ? parseInt(req.query.bookPerPage, 10)
        : 20;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        let filters = {};
        let sortString = "createdAt";
        let descendingOrDecending = 1;

        if (req.query.title) {
            filters = { $text: { $search: new RegExp(req.query.title, "i") } };
        } else if (req.query.author) {
            filters = { author: { $eq: new RegExp(req.query.author, "i") } };
        } else if (req.query.category) {
            filters = { category: {"$in": new RegExp(req.query.category, "i")} };
        }  else if (req.query.free) {
            if(req.query.free === 'true') {
                filters = { free: { $eq: true } };
            } else if(req.query.free === 'false') {
                filters = { free: { $eq: false } };
            }
        } else if (req.query.rating) {
            filters.rating = {
                $gt: Number(req.query.rating)
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
            const books = await bookModel.find();
            const foundBooks = await bookModel.find(filters).limit(bookPerPage).skip(bookPerPage * page).sort({[sortString]: descendingOrDecending}).populate('pdf');

            res.status(200).json({success: true, total_results: books.length, found_results: foundBooks.length, page: page, entries_per_page: bookPerPage, books: foundBooks})
        } catch (error) {
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to see all users!'})
    }

}

const addBook = async (req, res, next) => {
    const whoIsAddingBook = await userModel.findById(req.jwt.sub);
    try {
        const userRole = await roleModel.findOne({role: req.jwt.role});
        if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        const permissions = userRole.permissions.overBook;

        if(permissions.createBook) {
            const book = await bookModel.findOne({ title: req.body.title });
            if(book) {
                return res.status(409).json({success: false, msg: 'Book already exists!'});
            } else {
                const awsResponse = await s3Uploadv2(req.file);
                const pdf = await pdfModel.create({file: awsResponse.Location});

                req.body.pdf = pdf._id;
                const category = req.body.category.split(',');
                req.body.category = category;
                const newBook = await bookModel.create(req.body);
                // saving history
                const history = new historyModel({
                    name: whoIsAddingBook.name,
                    role: whoIsAddingBook.role,
                    email: whoIsAddingBook.email,
                    action: `Adding Book`,
                    message: `Adding book with the title of ${newBook.title}.`,
                });
                await history.save();
                return res.status(201).json({ success: true, msg: `Book with the title of ${newBook.title} has been added successfully !`})
            }
        } else {
            res.status(401).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch(e) {
        res.status(500).json({success: false, msg: e.message});
    }
    
}

const getBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.getBook) {
            const book = await bookModel.findById(req.params.id).populate('pdf');
            if(!book) return res.status(403).json({success: false, msg: `There is no book with the id of ${req.params.id}`});

            return res.status(200).json({success: true, book: book});
        } else {
            return res.status(404).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        return res.status(500).json({success: false, msg: error.message}); 
    }
}

const updateBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsUpdatingBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.updateBook) {
            let bookToUpdate = await bookModel.findById(req.params.id);  
            const updatesData = req.body;
            if(req.body.category) {
                const category = req.body.category.split(',');
                updatesData.category = category;
            }
            if(req.file) {
                const pdfToDelete = await pdfModel.findById(bookToUpdate.pdf);
                const s3 = new S3();
                let params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `uploads/${pdfToDelete.file.split('uploads/')[1]}`
                };
                await s3.deleteObject(params, function(err, data) {
                    if(err) {
                        console.log(err);
                    }
                    console.log(data)
                }).promise();

                const awsResponse = await s3Uploadv2(req.file);
                await pdfModel.updateOne({ _id: ObjectId(bookToUpdate.pdf) }, { $set: {file: awsResponse.Location } }, { new: true });
            }

            const updatingBook = await bookModel.updateOne({ _id: ObjectId(req.params.id) }, { $set: updatesData }, { new: true });
            
            if(updatingBook.modifiedCount < 1) 
                return res.status(404).json({ success: false, msg: `There is no book with the id of ${req.params.id} !` });

            // saving history
            const history = new historyModel({
                name: whoIsUpdatingBook.name,
                role: whoIsUpdatingBook.role,
                email: whoIsUpdatingBook.email,
                action: `Updating Book`,
                message: `Updating book called ${updatingBook.title}.`,
            });
            await history.save();
            return res.status(201).json({success: true, msg: `Book with the id of ${req.params.id} has been updated !`});
        } else {
            return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        }
    } catch (error) {
        res.status(500).json({success: false, msg: error.message})  
    }

    
}

const deleteBook = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    const whoIsDeletingBook = await userModel.findById(req.jwt.sub);
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    if(permissions.deleteBook) {
        try {
            const bookToDelete = await bookModel.findById(req.params.id);
            if(bookToDelete) {
                const pdfToDelete = await pdfModel.findById(bookToDelete.pdf);
                const s3 = new S3();
                let params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `uploads/${pdfToDelete.file.split('uploads/')[1]}`
                };
                await s3.deleteObject(params, function(err, data) {
                    if(err) {
                        console.log(err);
                    }
                    console.log(data)
                }).promise();

                await pdfModel.findByIdAndDelete(bookToDelete.pdf);
                await bookModel.findByIdAndDelete(req.params.id);
                // saving history
                const history = new historyModel({
                    name: whoIsDeletingBook.name,
                    role: whoIsDeletingBook.role,
                    email: whoIsDeletingBook.email,
                    action: `Deleting Book`,
                    message: `Deleting book with the id of ${req.params.id}.`,
                });
                await history.save();
                res.status(200).json({success: true, msg: `Book with the id of ${req.params.id} has been deleted!`})
            } else {
                res.status(404).json({success: false, msg: `Book with the id of ${req.params.id} does not exist !`})
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({success: false, msg: error.message})  
        }
    } else {
        res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    }
}

const favorite = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.updateBook) {
            const bookfavorite = await bookModel.findById(req.params.id);
            
            if(bookfavorite.favorite.includes(req.jwt.sub)) {
                await bookModel.updateOne(
                    { _id: req.params.id }, 
                    { $pull: { favorite: req.jwt.sub } });
    
                await favoriteModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { book: req.params.id } });
                return res.status(200).json({success: true, msg: `Successfully remove from favorite list !`});
            } else {
                await bookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { favorite: req.jwt.sub} }, { new: true });
                
                const alreadyFavoriteObjExist = await favoriteModel.findOne({userId: req.jwt.sub});
                if(alreadyFavoriteObjExist) {
                    await favoriteModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { book: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        book: req.params.id
                    };
                    await favoriteModel.create(dataToSave);
                }
                return res.status(200).json({success: true, msg: `Successfully added to favorite list !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
}

const download = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.updateBook) {
            const bookfavorite = await bookModel.findById(req.params.id);
            
            if(bookfavorite.download.includes(req.jwt.sub)) {
                await downloadModel.findOneAndUpdate(
                    { userId: req.jwt.sub },
                    { $pull: { book: req.params.id } });
                return res.status(200).json({success: true, msg: `Successfully removed from download list !`});
            } else {
                await bookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { download: req.jwt.sub} }, { new: true });
                

                const alreadyDownloadObjExist = await downloadModel.findOne({userId: req.jwt.sub});
                if(alreadyDownloadObjExist) {
                    await downloadModel.findOneAndUpdate(
                        { userId: req.jwt.sub },
                        { $push: { book: req.params.id } }, { new: true });
                } else {
                    const dataToSave = {
                        userId: req.jwt.sub,
                        book: req.params.id
                    };
                    await downloadModel.create(dataToSave);
                }

                return res.status(200).json({success: true, msg: `Successfully add download the book !`})
            }
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
}

const read = async (req, res, next) => {
    const userRole = await roleModel.findOne({role: req.jwt.role});
    
    if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.updateBook) {
            const bookfavorite = await bookModel.findById(req.params.id);
            
            if(bookfavorite.read.includes(req.jwt.sub)) {
                return res.status(200).json({success: true, msg: `Already add read the book !`});
            } else {
                const isAddingSuccess = await bookModel.findOneAndUpdate(
                    { _id: req.params.id },
                    { $push: { read: req.jwt.sub} }, { new: true });
                return res.status(200).json({success: true, msg: `Successfully add read the book !`});
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
    const permissions = userRole.permissions.overBook;

    try {
        if(permissions.getBook) {
            const categories = await bookModel.distinct('category');
            return res.status(200).json({success: true, categories: categories});
        } else {
            res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});
        } 
    } catch (error) {
        res.status(500).json({success: false, msg: error.message});
    }
}


module.exports = { getAllBooks, addBook, getBook, updateBook, deleteBook, favorite, download, read, getAllCategory };