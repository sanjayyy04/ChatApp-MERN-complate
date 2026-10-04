const mongoose = require("mongoose");

const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("Connected to MongoDB");
    } catch (error) {
        console.error(
            "Error connecting to MongoDB:",
            error.message
        );

        process.exit(1);
    }
};

module.exports = connectToDatabase;