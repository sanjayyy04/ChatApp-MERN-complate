require('dotenv').config();
const express = require('express');
const router = require('./routes/user.routes.js');
const { urlencoded } = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const cookieParser = require('cookie-parser');


const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        });
        console.log('Connected to MongoDB');

        const app = express()
        const port = process.env.PORT || 3000

        app.use(express.json());
        app.use(urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(cors({
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            credentials: true
        }));

        app.use('/api', router);

        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`)
        })

    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

connectToDatabase();
