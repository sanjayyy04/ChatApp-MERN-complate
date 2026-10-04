const FriendRequest = require("../models/friendRequestModel");

let ioRef = null;

const setSocialIo = (io) => {
    ioRef = io;
};

const getFriendIds = async (userId) => {
    const requests = await FriendRequest.find({
        status: "accepted",
        $or: [{ from: userId }, { to: userId }],
    }).select("from to");

    return requests.map((request) => (
        String(request.from) === String(userId) ? String(request.to) : String(request.from)
    ));
};

const broadcastProfileUpdated = async (user) => {
    if (!ioRef || !user) return;
    const payload = {
        user: {
            _id: user._id,
            userName: user.userName,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            updatedAt: user.updatedAt,
        },
    };
    const friendIds = await getFriendIds(user._id);
    ioRef.to(`user:${String(user._id)}`).emit("user:updated", payload);
    friendIds.forEach((friendId) => {
        ioRef.to(`user:${friendId}`).emit("user:updated", payload);
    });
};

const broadcastSocialUpdated = (userIds) => {
    if (!ioRef || !userIds?.length) return;
    const ids = [...new Set(userIds.map(String))];
    ioRef.emit("social:updated", { userIds: ids });
};

const broadcastFriendRequestsChanged = (userIds) => {
    if (!ioRef || !userIds?.length) return;
    const ids = [...new Set(userIds.map(String))];
    ioRef.emit("friend-requests:changed", { userIds: ids });
};

module.exports = {
    setSocialIo,
    broadcastSocialUpdated,
    broadcastFriendRequestsChanged,
    broadcastProfileUpdated,
};
