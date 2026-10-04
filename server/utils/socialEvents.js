let ioRef = null;

const setSocialIo = (io) => {
    ioRef = io;
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

module.exports = { setSocialIo, broadcastSocialUpdated, broadcastFriendRequestsChanged };
