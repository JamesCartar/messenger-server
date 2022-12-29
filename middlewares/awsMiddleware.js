const multer = require('multer');

// storing data in memory temporarily to upload to aws
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    let fileType = file.mimetype.split('/')[1];
    if(fileType === 'mpeg' || fileType === 'mp4' || fileType === 'pdf') {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1000000000, files: 1 },
});


module.exports = { upload };
  