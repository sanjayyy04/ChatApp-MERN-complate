const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "../uploads");

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = file.fieldname === "coverImage" ? "covers" : "avatars";
        const directory = path.join(uploadRoot, folder);
        fs.mkdirSync(directory, { recursive: true });
        cb(null, directory);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${req.user._id}-${Date.now()}${extension}`);
    },
});

const imageFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
    }
    cb(null, true);
};

const uploadProfileImages = multer({
    storage: profileStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]);

const chatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const directory = path.join(uploadRoot, "chat");
        fs.mkdirSync(directory, { recursive: true });
        cb(null, directory);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase() || "";
        cb(null, `${req.user._id}-${Date.now()}${extension}`);
    },
});

const chatFileFilter = (req, file, cb) => {
    const allowed = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "application/pdf",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowed.has(file.mimetype)) {
        return cb(new Error("File type not allowed for chat."));
    }
    cb(null, true);
};

const uploadChatAttachment = multer({
    storage: chatStorage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
}).single("attachment");

const removeUploadedFile = (publicPath) => {
    if (!publicPath || !publicPath.startsWith("/uploads/")) return;
    const absolutePath = path.join(__dirname, "..", publicPath);
    fs.promises.unlink(absolutePath).catch(() => {});
};

module.exports = { uploadProfileImages, uploadChatAttachment, removeUploadedFile };
