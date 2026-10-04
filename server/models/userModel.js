const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    userName:{
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phone:{
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: "",
        maxlength: 280
    },
    avatar: {
        type: String,
        default: ""
    },
    coverImage: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const user = mongoose.model("User", userSchema);
module.exports = user;