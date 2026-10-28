const express = require("express");
const { register, login, loginStart } = require("../controller/auth.controller.js");

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/login/start", loginStart);
authRouter.get("/health", (req, res) => res.json({ ok: true, service: "auth" }));

module.exports = authRouter;
