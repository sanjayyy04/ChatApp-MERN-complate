const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");
const { extractToken } = require("../utils/extractToken.js");

const authMiddleware = async (req, res, next) => {
    try {
        const token = extractToken(req);

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

        const tokenType = decoded.typ || "session";

        if (tokenType === "session") {
            if (
                decoded.sv !== undefined
                && Number(decoded.sv) !== Number(currentUser.sessionVersion || 0)
            ) {
                return res.status(401).json({ message: "Session revoked. Please login again." });
            }
        }

        req.user = currentUser;
        req.tokenType = tokenType;
        req.tokenPayload = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token.",
        });
    }
};

/** Only full authenticated session tokens. */
const requireSession = (req, res, next) => {
    if (req.tokenType !== "session") {
        return res.status(403).json({ message: "Please sign in again." });
    }
    next();
};

module.exports = authMiddleware;
module.exports.requireSession = requireSession;
