const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized. Please login first.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const currentUser = await User.findById(decoded.id).select("-password");

        if (!currentUser) {
            return res.status(401).json({
                message: "User no longer exists.",
            });
        }

        req.user = currentUser;
        next();

    } catch (error) {
        console.log("error while Authenticating user", error);
        return res.status(401).json({
            message: "Invalid or expired token.",
        })
    }

}

module.exports = authMiddleware;