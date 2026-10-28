const jwt = require("jsonwebtoken");
const { getAuthCookieOptions } = require("../utils/authCookie.js");

const SESSION_EXPIRES = "7d";

const signSessionToken = (user) => jwt.sign(
    {
        id: String(user._id),
        typ: "session",
        sv: user.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_EXPIRES },
);

const setSessionCookie = (res, token) => {
    res.cookie("token", token, getAuthCookieOptions());
};

const clearSessionCookie = (res) => {
    res.clearCookie("token", getAuthCookieOptions());
};

const decodeToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
    signSessionToken,
    setSessionCookie,
    clearSessionCookie,
    decodeToken,
};
