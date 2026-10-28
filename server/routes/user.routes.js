const express = require("express");
const router = express.Router();

const {
    helloWorld,
    deprecatedLegacyAuth,
    getAllUsers,
    searchUsers,
    getUserById,
    deleteUserById,
    logoutController,
    getProfileController,
    updateProfileController,
    updateNotificationPreferences,
} = require("../controller/user.controller.js");
const {
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
} = require("../controller/friendRequest.controller.js");
const {
    getConversation,
    sendChatAttachment,
    deleteMessage,
    deleteConversation,
} = require("../controller/message.controller.js");
const {
    listGroups,
    createGroup,
    getGroup,
    updateGroupSettings,
    addGroupMembers,
    removeGroupMember,
    deleteGroup,
    getGroupMessages,
    sendGroupAttachment,
    searchFriendsForGroup,
    listDiscoverableGroups,
    joinGroup,
    joinGroupByInvite,
    previewGroupInvite,
    listJoinRequests,
    respondJoinRequest,
    regenerateGroupInvite,
} = require("../controller/group.controller.js");

const authMiddleware = require("../middleware/auth.middleware.js");
const { requireSession } = require("../middleware/auth.middleware.js");
const validateGroupId = require("../middleware/validateGroupId.js");
const searchRateLimit = require("../middleware/searchRateLimit.js");
const { uploadProfileImages, uploadChatAttachment } = require("../middleware/upload.middleware.js");

const chatGuard = [authMiddleware, requireSession];

router.get("/hello", helloWorld);
router.post("/create", deprecatedLegacyAuth);
router.post("/login", deprecatedLegacyAuth);
router.post("/logout", authMiddleware, requireSession, logoutController);

router.get("/profile", authMiddleware, requireSession, getProfileController);
router.patch("/profile/notifications", ...chatGuard, updateNotificationPreferences);
router.patch("/profile", authMiddleware, requireSession, (req, res, next) => {
    uploadProfileImages(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Image upload failed." });
        }
        next();
    });
}, updateProfileController);
router.get("/users", ...chatGuard, getAllUsers);
router.get("/users/search", ...chatGuard, searchRateLimit, searchUsers);
router.post("/friend-requests/:userId", ...chatGuard, sendFriendRequest);
router.delete("/friend-requests/:userId", ...chatGuard, cancelFriendRequest);
router.get("/friend-requests/received", ...chatGuard, getReceivedRequests);
router.get("/friend-requests/sent", ...chatGuard, getSentRequests);
router.patch("/friend-requests/:id/:action", ...chatGuard, respondToRequest);
router.get("/friends", ...chatGuard, getFriends);
router.delete("/friends/:userId", ...chatGuard, removeFriend);
router.get("/social/stats", ...chatGuard, getFollowStats);
router.get("/social/stats/:userId", ...chatGuard, getUserFollowStats);
router.get("/social/followers", ...chatGuard, getFollowers);
router.get("/social/following", ...chatGuard, getFollowing);
router.delete("/messages/conversation/:userId", ...chatGuard, deleteConversation);
router.get("/messages/:userId", ...chatGuard, getConversation);
router.post("/messages/:userId/attachment", ...chatGuard, (req, res, next) => {
    uploadChatAttachment(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Attachment upload failed." });
        }
        next();
    });
}, sendChatAttachment);
router.delete("/messages/:messageId", ...chatGuard, deleteMessage);
router.get("/groups/discover", ...chatGuard, listDiscoverableGroups);
router.get("/groups/invite/:code/preview", previewGroupInvite);
router.post("/groups/join/invite", ...chatGuard, joinGroupByInvite);
router.get("/groups", ...chatGuard, listGroups);
router.post("/groups", ...chatGuard, createGroup);
router.get("/groups/:groupId", ...chatGuard, validateGroupId, getGroup);
router.patch("/groups/:groupId", ...chatGuard, validateGroupId, updateGroupSettings);
router.post("/groups/:groupId/join", ...chatGuard, validateGroupId, joinGroup);
router.get("/groups/:groupId/join-requests", ...chatGuard, validateGroupId, listJoinRequests);
router.post("/groups/:groupId/join-requests/:userId", ...chatGuard, validateGroupId, respondJoinRequest);
router.post("/groups/:groupId/invite/regenerate", ...chatGuard, validateGroupId, regenerateGroupInvite);
router.post("/groups/:groupId/members", ...chatGuard, validateGroupId, addGroupMembers);
router.delete("/groups/:groupId/members/:userId", ...chatGuard, validateGroupId, removeGroupMember);
router.delete("/groups/:groupId", ...chatGuard, validateGroupId, deleteGroup);
router.get("/groups/:groupId/messages", ...chatGuard, validateGroupId, getGroupMessages);
router.get("/groups/:groupId/member-search", ...chatGuard, validateGroupId, searchFriendsForGroup);
router.post("/groups/:groupId/attachment", ...chatGuard, validateGroupId, (req, res, next) => {
    uploadChatAttachment(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Attachment upload failed." });
        }
        next();
    });
}, sendGroupAttachment);
router.get("/users/:id", ...chatGuard, getUserById);
router.delete("/users/:id", ...chatGuard, deleteUserById);

module.exports = router;
