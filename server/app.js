const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { urlencoded } = require("express");

const router = require("./routes/user.routes.js");
const { getClientOrigins } = require("./config/cors.js");

const app = express();

// Body parser
app.use(express.json());
app.use(urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// CORS
app.use(
    cors({
        origin: getClientOrigins(),
        credentials: true,
    }),
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", router);

module.exports = app;