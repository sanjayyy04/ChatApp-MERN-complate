const express = require('express');
const router = require('./routes/user.routes.js');
const { urlencoded } = require('express');
const mongoose = require('mongoose');

const connectToDatabase = async () => {
    try {
        await mongoose.connect('mongodb+srv://smchauhan2004_db_user:iblI4JrkvOUxXmG9@cluster0.pyelxx0.mongodb.net/?appName=Cluster0');
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};