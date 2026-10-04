const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require("../models/userModel.js");
const { removeUploadedFile } = require("../middleware/upload.middleware.js");
const { getAuthCookieOptions } = require("../utils/authCookie.js");
const { broadcastProfileUpdated } = require("../utils/socialEvents.js");

const helloWorld = (req, res) => {
    res.send("Hello World! api is running....");
}

const createUser = async (req, res) => {
    const { userName, name, phone, email, password } = req.body;
    // Check if user already exists
    const existingUser = await user.findOne({ phone, userName });

    if (existingUser) {
        return res.status(400).json({
            message: "User already exists"
        });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new user({
        userName,
        name,
        phone,
        email,
        password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
        message: "User created successfully",
        data: newUser
    });

}

const getAllUsers = async (req, res) => {

    const users = await user.find({ _id: { $ne: req.user._id } }).select("-password");

    res.status(200).json({
        message: "Users retrieved successfully",
        data: users
    });
};

const searchUsers = async (req, res) => {
    const username = req.query.username?.trim();

    if (!username) {
        return res.status(400).json({
            message: "Username is required"
        });
    }

    const users = await user.find({
        userName: { $regex: username, $options: "i" },
        _id: { $ne: req.user._id }
    }).select("-password").limit(20);

    return res.status(200).json({
        message: "Users found successfully",
        data: users
    });
};

const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const userById = await user.findById(id).select("-password");

        if (!userById) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        res.status(200).json({
            message: "User retrieved successfully",
            data: userById
        });
    }
    catch (error) {
        res.status(404).json({
            message: "User not found",
            error: error.message
        });
    }
}

const deleteUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const userById = await user.findByIdAndDelete(id);
        res.status(200).json({
            message: "User deleted successfully",
            data: userById
        });
    }
    catch (error) {
        res.status(404).json({
            message: "User not found",
            error: error.message
        });
    }
}

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const existingUser = await user.findOne({ email });

        if (!existingUser) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, existingUser.password);

        if (isMatch) {
            const token = jwt.sign(
                {
                    id: existingUser._id,
                    userName: existingUser.userName,
                    name: existingUser.name,
                    email: existingUser.email
                },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.cookie("token", token, getAuthCookieOptions());

            return res.status(200).json({
                message: "Login successful",
                token,
            });
        }
        else {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }

}

const logoutController = (req, res) => {
    res.clearCookie("token", getAuthCookieOptions());

    return res.status(200).json({
        message: "Logout successful"
    });
};

const getProfileController = (req, res) => {
    return res.status(200).json({
        message: "Profile fetched successfully",
        data: req.user,
    });
};

const updateProfileController = async (req, res) => {
    try {
        const { name, userName, email, phone, bio } = req.body;
        const currentUser = await user.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (userName && userName.trim() !== currentUser.userName) {
            const takenName = await user.findOne({
                userName: userName.trim(),
                _id: { $ne: currentUser._id },
            });
            if (takenName) {
                return res.status(400).json({ message: "Username already taken" });
            }
            currentUser.userName = userName.trim();
        }

        if (email && email.trim() !== currentUser.email) {
            const takenEmail = await user.findOne({
                email: email.trim(),
                _id: { $ne: currentUser._id },
            });
            if (takenEmail) {
                return res.status(400).json({ message: "Email already in use" });
            }
            currentUser.email = email.trim();
        }

        if (name) currentUser.name = name.trim();
        if (phone !== undefined && phone !== "") currentUser.phone = phone;
        if (bio !== undefined) currentUser.bio = String(bio).slice(0, 280);

        if (req.files?.avatar?.[0]) {
            removeUploadedFile(currentUser.avatar);
            currentUser.avatar = `/uploads/avatars/${req.files.avatar[0].filename}`;
        }

        if (req.files?.coverImage?.[0]) {
            removeUploadedFile(currentUser.coverImage);
            currentUser.coverImage = `/uploads/covers/${req.files.coverImage[0].filename}`;
        }

        await currentUser.save();
        const data = currentUser.toObject();
        delete data.password;

        broadcastProfileUpdated(currentUser).catch(() => {});

        return res.status(200).json({
            message: "Profile updated successfully",
            data,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Could not update profile",
            error: error.message,
        });
    }
};

module.exports = { helloWorld, createUser, getAllUsers, searchUsers, getUserById, deleteUserById, loginController, logoutController, getProfileController, updateProfileController };
