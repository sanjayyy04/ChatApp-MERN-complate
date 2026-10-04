const express = require("express");
const router = express.Router();

const {
    helloWorld,
    createUser,
    getAllUsers,
    searchUsers,
    getUserById,
    deleteUserById,
    loginController,
    logoutController,
    getProfileController,
    updateProfileController,
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
} = require("../controller/friendRequest.controller.js");
const { getConversation, sendChatAttachment, deleteMessage } = require("../controller/message.controller.js");

const authMiddleware = require("../middleware/auth.middleware.js");
const { uploadProfileImages, uploadChatAttachment } = require("../middleware/upload.middleware.js");

router.get("/hello", helloWorld);
router.post("/create", createUser);
router.post("/login", loginController);
router.post("/logout", logoutController);

router.get("/profile", authMiddleware, getProfileController);
router.patch("/profile", authMiddleware, (req, res, next) => {
    uploadProfileImages(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Image upload failed." });
        }
        next();
    });
}, updateProfileController);
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/search", authMiddleware, searchUsers);
router.post("/friend-requests/:userId", authMiddleware, sendFriendRequest);
router.delete("/friend-requests/:userId", authMiddleware, cancelFriendRequest);
router.get("/friend-requests/received", authMiddleware, getReceivedRequests);
router.get("/friend-requests/sent", authMiddleware, getSentRequests);
router.patch("/friend-requests/:id/:action", authMiddleware, respondToRequest);
router.get("/friends", authMiddleware, getFriends);
router.get("/social/stats", authMiddleware, getFollowStats);
router.get("/social/stats/:userId", authMiddleware, getUserFollowStats);
router.get("/social/followers", authMiddleware, getFollowers);
router.get("/social/following", authMiddleware, getFollowing);
router.get("/messages/:userId", authMiddleware, getConversation);
router.post("/messages/:userId/attachment", authMiddleware, (req, res, next) => {
    uploadChatAttachment(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || "Attachment upload failed." });
        }
        next();
    });
}, sendChatAttachment);
router.delete("/messages/:messageId", authMiddleware, deleteMessage);
router.get("/users/:id", authMiddleware, getUserById);
router.delete("/users/:id", authMiddleware, deleteUserById);

module.exports = router;
