const mongoose = require("mongoose");

/** Reject non-ObjectId :groupId params (e.g. /groups/discover mistaken match). */
const validateGroupId = (req, res, next) => {
    const { groupId } = req.params;
    if (!groupId || !mongoose.isValidObjectId(groupId)) {
        return res.status(404).json({ message: "Group not found." });
    }
    next();
};

module.exports = validateGroupId;
