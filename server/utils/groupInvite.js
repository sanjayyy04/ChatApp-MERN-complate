const crypto = require("crypto");

const generateInviteCode = () => crypto.randomBytes(16).toString("base64url");

module.exports = { generateInviteCode };
