if (process.env.NODE_ENV !== "production") {
require("dotenv").config()
}
const express = require('express')
const cookieSession = require('cookie-session')
const passport = require('passport')
const cors = require('cors')
const https = require('http')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const admin = require('firebase-admin')

const app = express()

require('./config/passport.js')
const connectDB = require('./config/connectDb.js')
const otpRouter = require('./routes/otpRoute.js')
const authRouter = require('./routes/authRoute.js')
const userRouter = require('./routes/userRoute.js')
const roleRouter = require('./routes/roleRoute.js')
const packageRouter = require('./routes/packageRoute.js')
const historyRouter = require('./routes/historyRoute.js')
const bookRouter = require('./routes/bookRoute.js')
const audioBookRouter = require('./routes/audioBookRoute.js')
const videoBookRouter = require('./routes/videoBookRoute.js')
const favoriteRouter = require('./routes/favoriteRoute.js')
const downloadRouter = require('./routes/downloadRoute.js')
const emailRouter = require('./routes/emailRoute.js')
const notificationRouter = require('./routes/notificationRoute.js')
const pushNotiRouter = require('./routes/pushNotiRoute.js')
const googleRouter = require('./routes/googleRoute.js')
let serviceAccount = require("./google-services.json")

const { authMiddleware }  = require('./middlewares/authMiddleware.js')
const { upload } = require('./middlewares/awsMiddleware.js')


app.use(cors({
    origin:  'http://localhost:3000', 
    credentials: true,
}))

app.use(
    cookieSession({ name: "session", keys: ["lama"], maxAge: 24 * 60 * 60 * 100 })
)


app.use(passport.initialize())
app.use(passport.session())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
// welcom route
app.get('/', (req, res, next) => {
    res.status(200).json({success: true, msg: "Welcome from messenger api !"})
})
app.use('/otp', otpRouter)
app.use('/auth', authRouter)
app.use('/history', authMiddleware, historyRouter)
app.use('/users', authMiddleware, userRouter)
app.use('/roles', authMiddleware, roleRouter)
app.use('/packages', authMiddleware, packageRouter)
app.use('/books', authMiddleware, upload.single("file"), bookRouter)
app.use('/audios', authMiddleware, upload.single("file"), audioBookRouter)
app.use('/videos', authMiddleware, upload.single("file"), videoBookRouter)
app.use('/favorites', authMiddleware, favoriteRouter)
app.use('/downloads', authMiddleware, downloadRouter)
app.use('/email', authMiddleware, emailRouter)
app.use('/google', authMiddleware, googleRouter)
app.use('/pushNoti', authMiddleware, pushNotiRouter)
app.use('/notification', authMiddleware, notificationRouter)


// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
        success: false,
        message: "File is too large",
        })
    }

    if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
        success: false,
        message: "File limit reached",
        })
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
        success: false,
        message: "Uploaded file Must be pdf, mp3 or mp4 file",
        })
    }
    } else {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error,
        })
    }
})


const PORT = process.env.PORT || 3000

const start = async () => {
    try {
        // connecting to Mongodb
        connectDB(process.env.MONGO_URI)
        
        app.listen(PORT, () => {
            console.log(`Server is listening on port http://www.localhost:${PORT}`)
        })
    } catch(error) {
        console.log(error)
    }
}

start()
    