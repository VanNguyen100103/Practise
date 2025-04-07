const express = require('express');
const dotenv = require('dotenv');
dotenv.config({path: "./.env"})

const cookieParser = require('cookie-parser');
const cors = require('cors');
const connDb = require('./configs/dbconnection');
const initRoutes = require('./routes');


const app = express();
const port = process.env.PORT || 8888

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))


connDb()
initRoutes(app)

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
}
)


