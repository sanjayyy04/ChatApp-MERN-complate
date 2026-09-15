const express = require("express");
const router = express.Router();
const { helloWorld, createUser, getAllUsers, getUserById, deleteUserById, loginController, logoutController, getProfileController } = require("../controller/user.controller.js");

router.get("/hello", helloWorld);
router.post("/create", createUser);
router.post("/login", loginController);
router.post("/logout", logoutController);
router.get("/profile", getProfileController);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUserById);
// router.get("/users/delete/:id", deleteUserById);

module.exports = router;