const FriendRequest = require("../models/friendRequestModel");

const areFriends = async (firstUserId, secondUserId) => Boolean(
    await FriendRequest.exists({
        status: "accepted",
        $or: [{ from: firstUserId, to: secondUserId }, { from: secondUserId, to: firstUserId }],
    }),
);

module.exports = { areFriends };
