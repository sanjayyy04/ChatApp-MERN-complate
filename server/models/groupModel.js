const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    onlyAdminCanSend: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: true },
    requireJoinApproval: { type: Boolean, default: true },
    inviteCode: { type: String, unique: true, sparse: true },
    joinRequests: [joinRequestSchema],
    maxMembers: { type: Number, default: 100, min: 2, max: 256 },
}, { timestamps: true });

groupSchema.index({ isPrivate: 1, name: 1 });

groupSchema.index({ members: 1 });
groupSchema.index({ admin: 1 });

module.exports = mongoose.model("Group", groupSchema);
