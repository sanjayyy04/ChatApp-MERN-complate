const mongoose = require("mongoose");
const FriendRequest = require("../models/friendRequestModel");
const User = require("../models/userModel");
const { broadcastSocialUpdated, broadcastFriendRequestsChanged } = require("../utils/socialEvents");
const { emitFriendRequestReceived } = require("../utils/realtime");

const countFollowStats = async (userId) => {
    const [followers, following] = await Promise.all([
        FriendRequest.countDocuments({ to: userId, status: "accepted" }),
        FriendRequest.countDocuments({ from: userId, status: "accepted" }),
    ]);
    return { followers, following };
};

const sendFriendRequest = async (req, res) => {
    const recipientId = req.params.userId;
    if (!mongoose.isValidObjectId(recipientId) || recipientId === String(req.user._id)) return res.status(400).json({ message: "Choose a different valid user." });
    if (!(await User.exists({ _id: recipientId }))) return res.status(404).json({ message: "User not found." });
    const existing = await FriendRequest.findOne({ $or: [{ from: req.user._id, to: recipientId }, { from: recipientId, to: req.user._id }] });
    if (existing) return res.status(409).json({ message: `A friend request is already ${existing.status}.` });
    const request = await FriendRequest.create({ from: req.user._id, to: recipientId });
    broadcastFriendRequestsChanged([req.user._id, recipientId]);
    emitFriendRequestReceived(recipientId, {
        requestId: String(request._id),
        from: {
            _id: req.user._id,
            userName: req.user.userName,
            name: req.user.name,
            avatar: req.user.avatar,
        },
    });
    return res.status(201).json({ message: "Friend request sent.", data: request });
};

const cancelFriendRequest = async (req, res) => {
    const recipientId = req.params.userId;
    if (!mongoose.isValidObjectId(recipientId)) {
        return res.status(400).json({ message: "Invalid user." });
    }
    const request = await FriendRequest.findOneAndDelete({
        from: req.user._id,
        to: recipientId,
        status: "pending",
    });
    if (!request) {
        return res.status(404).json({ message: "No pending request to cancel." });
    }
    broadcastFriendRequestsChanged([req.user._id, recipientId]);
    return res.json({ message: "Friend request canceled." });
};

const getReceivedRequests = async (req, res) => {
    const requests = await FriendRequest.find({ to: req.user._id, status: "pending" }).populate("from", "userName name email").sort({ createdAt: -1 });
    return res.json({ data: requests });
};

const getSentRequests = async (req, res) => {
    const requests = await FriendRequest.find({ from: req.user._id, status: "pending" })
        .populate("to", "userName name email avatar bio")
        .sort({ createdAt: -1 });
    return res.json({ data: requests.map((request) => request.to) });
};

const respondToRequest = async (req, res) => {
    if (!["accept", "reject"].includes(req.params.action)) return res.status(400).json({ message: "Action must be accept or reject." });
    const status = req.params.action === "accept" ? "accepted" : "rejected";
    const request = await FriendRequest.findOneAndUpdate({ _id: req.params.id, to: req.user._id, status: "pending" }, { status }, { new: true });
    if (!request) return res.status(404).json({ message: "Pending friend request not found." });
    if (status === "accepted") {
        broadcastSocialUpdated([request.from, request.to]);
    }
    broadcastFriendRequestsChanged([request.from, request.to]);
    return res.json({ message: `Friend request ${status}.`, data: request });
};

const getFriends = async (req, res) => {
    const requests = await FriendRequest.find({ status: "accepted", $or: [{ from: req.user._id }, { to: req.user._id }] }).populate("from to", "userName name email avatar bio updatedAt");
    const friends = requests.map((request) => String(request.from._id) === String(req.user._id) ? request.to : request.from);
    return res.json({ data: friends });
};

const getFollowStats = async (req, res) => {
    const data = await countFollowStats(req.user._id);
    return res.json({ data });
};

const getUserFollowStats = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user." });
    }
    if (!(await User.exists({ _id: userId }))) {
        return res.status(404).json({ message: "User not found." });
    }
    const data = await countFollowStats(userId);
    return res.json({ data });
};

const getFollowers = async (req, res) => {
    const requests = await FriendRequest.find({ to: req.user._id, status: "accepted" })
        .populate("from", "userName name email")
        .sort({ updatedAt: -1 });
    return res.json({ data: requests.map((request) => request.from) });
};

const getFollowing = async (req, res) => {
    const requests = await FriendRequest.find({ from: req.user._id, status: "accepted" })
        .populate("to", "userName name email")
        .sort({ updatedAt: -1 });
    return res.json({ data: requests.map((request) => request.to) });
};

const removeFriend = async (req, res) => {
    const otherUserId = req.params.userId;
    if (!mongoose.isValidObjectId(otherUserId) || otherUserId === String(req.user._id)) {
        return res.status(400).json({ message: "Invalid user." });
    }

    const request = await FriendRequest.findOneAndDelete({
        status: "accepted",
        $or: [
            { from: req.user._id, to: otherUserId },
            { from: otherUserId, to: req.user._id },
        ],
    });

    if (!request) {
        return res.status(404).json({ message: "Friendship not found." });
    }

    broadcastSocialUpdated([req.user._id, otherUserId]);
    broadcastFriendRequestsChanged([req.user._id, otherUserId]);
    return res.json({ message: "Unfollowed successfully." });
};

module.exports = {
    sendFriendRequest,
    cancelFriendRequest,
    getReceivedRequests,
    getSentRequests,
    respondToRequest,
    getFriends,
    getFollowStats,
    getUserFollowStats,
    getFollowers,
    getFollowing,
    removeFriend,
};
