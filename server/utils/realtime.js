const FriendRequest = require("../models/friendRequestModel");

let ioRef = null;
const onlineCounts = new Map();

const setRealtimeIo = (io) => {
    ioRef = io;
};

const getAcceptedFriendIds = async (userId) => {
    const requests = await FriendRequest.find({
        status: "accepted",
        $or: [{ from: userId }, { to: userId }],
    }).select("from to");

    return requests.map((request) => (
        String(request.from) === String(userId) ? String(request.to) : String(request.from)
    ));
};

const broadcastPresenceToFriends = async (userId, online) => {
    if (!ioRef) return;
    const friends = await getAcceptedFriendIds(userId);
    const payload = { userId: String(userId), online: Boolean(online) };
    friends.forEach((friendId) => {
        ioRef.to(`user:${friendId}`).emit("presence:status", payload);
    });
};

const getOnlineFriendIds = async (userId) => {
    const friends = await getAcceptedFriendIds(userId);
    return friends.filter((friendId) => (onlineCounts.get(String(friendId)) || 0) > 0);
};

const handleSocketConnection = async (userId) => {
    const key = String(userId);
    const next = (onlineCounts.get(key) || 0) + 1;
    onlineCounts.set(key, next);
    if (next === 1) {
        await broadcastPresenceToFriends(userId, true);
    }
    const onlineUserIds = await getOnlineFriendIds(userId);
    return { onlineUserIds };
};

const handleSocketDisconnect = async (userId) => {
    const key = String(userId);
    const next = (onlineCounts.get(key) || 1) - 1;
    if (next <= 0) {
        onlineCounts.delete(key);
        await broadcastPresenceToFriends(userId, false);
    } else {
        onlineCounts.set(key, next);
    }
};

const emitFriendRequestReceived = (toUserId, payload) => {
    if (!ioRef) return;
    ioRef.to(`user:${toUserId}`).emit("friend-request:received", payload);
};

module.exports = {
    setRealtimeIo,
    handleSocketConnection,
    handleSocketDisconnect,
    emitFriendRequestReceived,
};
