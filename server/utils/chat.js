const FriendRequest = require("../models/friendRequestModel");

const areFriends = (firstUserId, secondUserId) => FriendRequest.exists({
    status: "accepted",
    $or: [{ from: firstUserId, to: secondUserId }, { from: secondUserId, to: firstUserId }],
});

module.exports = { areFriends };
