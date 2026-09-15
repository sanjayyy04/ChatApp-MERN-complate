const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const user = require("../models/userModel.js");

const helloWorld = (req, res) => {
    res.send("Hello World! api is running....");
}

const createUser = async (req, res) => {
    const { userName, name, phone, email, password } = req.body;
    // Check if user already exists
    const existingUser = await user.findOne({ phone, email, userName });

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

    const users = await user.find();

    res.status(200).json({
        message: "Users retrieved successfully",
        data: users
    });
};

const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const userById = await user.findById(id);
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
                "your_secret_key",
                { expiresIn: "1h" }
            );

            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 60 * 60 * 1000,
                sameSite: "lax",
                path: "/"
            });

            return res.status(200).json({
                message: "Login successful"
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
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
    });

    return res.status(200).json({
        message: "Logout successful"
    });
};

const getProfileController = (req, res) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized. Please login first."
        });
    }

    try {
        const decoded = jwt.verify(token, "your_secret_key");

        return res.status(200).json({
            message: "Profile fetched successfully",
            data: {
                id: decoded.id,
                userName: decoded.userName,
                name: decoded.name,
                email: decoded.email,
                phone: decoded.phone,
                createdAt: decoded.createdAt,
                updatedAt: decoded.updatedAt
            }
        });
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token",
            error: error.message
        });
    }
};

module.exports = { helloWorld, createUser, getAllUsers, getUserById, deleteUserById, loginController, logoutController, getProfileController };