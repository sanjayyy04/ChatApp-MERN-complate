const user = require("../models/userModel.js");
const { removeUploadedFile } = require("../middleware/upload.middleware.js");
const { getAuthCookieOptions } = require("../utils/authCookie.js");
const { broadcastProfileUpdated } = require("../utils/socialEvents.js");
const { escapeRegex } = require("../utils/escapeRegex");
const { PUBLIC_USER_SELECT, toPublicUser } = require("../utils/publicUser.js");

const helloWorld = (req, res) => {
    res.send("Hello World! api is running....");
}

const getAllUsers = async (req, res) => {
    return res.status(403).json({
        message: "Browse is disabled. Search by username to find people.",
    });
};

const SEARCH_MIN_LEN = 2;
const SEARCH_MAX_LEN = 32;

const searchUsers = async (req, res) => {
    let username = (req.query.username || req.query.q || "").trim();
    if (username.startsWith("@")) username = username.slice(1).trim();

    if (!username) {
        return res.status(400).json({
            message: "Enter a username to search.",
        });
    }

    if (username.length < SEARCH_MIN_LEN) {
        return res.status(400).json({
            message: `Enter at least ${SEARCH_MIN_LEN} characters.`,
        });
    }

    if (username.length > SEARCH_MAX_LEN) {
        return res.status(400).json({
            message: "Search query is too long.",
        });
    }

    const pattern = escapeRegex(username);
    const users = await user.find({
        userName: { $regex: pattern, $options: "i" },
        _id: { $ne: req.user._id },
    })
        .select(PUBLIC_USER_SELECT)
        .limit(15)
        .lean();

    return res.status(200).json({
        message: "Users found successfully",
        data: users.map(toPublicUser),
    });
};

const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const userById = await user.findById(id).select("-password");

        if (!userById) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isSelf = String(userById._id) === String(req.user._id);
        const payload = isSelf ? userById : toPublicUser(userById);

        res.status(200).json({
            message: "User retrieved successfully",
            data: payload,
        });
    }
    catch (error) {
        res.status(404).json({
            message: "User not found",
            error: error.message,
        });
    }
};

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

const logoutController = async (req, res) => {
    try {
        await user.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    } catch {
        /* ignore */
    }
    res.clearCookie("token", getAuthCookieOptions());

    return res.status(200).json({
        message: "Logout successful",
    });
};

const getProfileController = (req, res) => {
    const data = req.user.toObject ? req.user.toObject() : { ...req.user };
    delete data.password;
    return res.status(200).json({
        message: "Profile fetched successfully",
        data,
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

const deprecatedLegacyAuth = (req, res) => res.status(410).json({
    message: "This endpoint is retired. Use POST /api/auth/register or POST /api/auth/login/start instead.",
    code: "ENDPOINT_RETIRED",
});

const updateNotificationPreferences = async (req, res) => {
    try {
        const prefs = req.body?.notificationPreferences || req.body;
        const allowed = ["emailSecurityAlerts", "emailLoginAlerts", "emailUnreadMessages"];
        const currentUser = await user.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!currentUser.notificationPreferences) {
            currentUser.notificationPreferences = {};
        }
        allowed.forEach((key) => {
            if (typeof prefs[key] === "boolean") {
                currentUser.notificationPreferences[key] = prefs[key];
            }
        });
        await currentUser.save();
        const data = currentUser.toObject();
        delete data.password;
        return res.json({
            message: "Notification preferences updated.",
            data,
        });
    } catch (error) {
        return res.status(500).json({ message: "Could not update preferences." });
    }
};

module.exports = {
    helloWorld,
    deprecatedLegacyAuth,
    getAllUsers,
    searchUsers,
    getUserById,
    deleteUserById,
    logoutController,
    getProfileController,
    updateProfileController,
    updateNotificationPreferences,
};
