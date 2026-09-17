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
} = require("../controller/user.controller.js");

const authMiddleware = require("../middleware/auth.middleware.js");

router.get("/hello", helloWorld);
router.post("/create", createUser);
router.post("/login", loginController);
router.post("/logout", logoutController);

router.get("/profile", authMiddleware, getProfileController);
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/search", authMiddleware, searchUsers);
router.get("/users/:id", authMiddleware, getUserById);
router.delete("/users/:id", authMiddleware, deleteUserById);

module.exports = router;