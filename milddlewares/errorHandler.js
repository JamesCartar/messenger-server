const { CustomApiError } = require('./errors');
const { StatusCodes } = require("http-status-codes");

const errorHandler = (error, req, res, next) => {
    if (error instanceof CustomApiError) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
};


module.exports = { errorHandler };