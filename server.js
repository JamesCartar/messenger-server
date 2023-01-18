if (process.env.NODE_ENV !== "production") {
    require("dotenv").config()
}
const express = require('express')
const { notFound } = require("./milddlewares/404.js")

const { errorHandler } = require('./milddlewares/errorHandler.js')
const authRoute = require('./routes/auth.js')

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.get('/', (req, res, next) => {
    res.status(200).json({ success: true, message: 'Welcome from social media api :)' })
})
app.use('/auth', authRoute)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`Server is listening on port: http://www.locahost:${PORT}`)
})