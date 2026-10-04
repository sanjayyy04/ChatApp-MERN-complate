const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const { areFriends } = require("../utils/chat");
const { broadcastMessage, broadcastMessageDeleted } = require("../utils/messageEvents");

const removeChatAttachmentFile = (attachmentUrl) => {
    if (!attachmentUrl?.startsWith("/uploads/chat/")) return;
    const filePath = path.join(__dirname, "..", attachmentUrl.replace(/^\//, ""));
    fs.unlink(filePath, () => {});
};

const getConversation = async (req, res) => {
    const otherUserId = req.params.userId;
    if (!mongoose.isValidObjectId(otherUserId)) return res.status(400).json({ message: "Invalid user." });
    if (!(await areFriends(req.user._id, otherUserId))) {
        return res.status(403).json({ message: "You can only chat with accepted friends." });
    }
    const messages = await Message.find({
        $or: [
            { sender: req.user._id, receiver: otherUserId },
            { sender: otherUserId, receiver: req.user._id },
        ],
        deletedFor: { $nin: [req.user._id] },
    }).sort({ createdAt: 1 });
    return res.json({ data: messages });
};

const sendChatAttachment = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        if (!mongoose.isValidObjectId(otherUserId)) {
            return res.status(400).json({ message: "Invalid user." });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Attachment is required." });
        }
        if (!(await areFriends(req.user._id, otherUserId))) {
            return res.status(403).json({ message: "You can only chat with accepted friends." });
        }

        let messageType = "file";
        if (req.file.mimetype.startsWith("image/")) messageType = "image";
        else if (req.file.mimetype.startsWith("video/")) messageType = "video";

        const message = await Message.create({
            sender: req.user._id,
            receiver: otherUserId,
            text: String(req.body.caption || "").trim().slice(0, 2000),
            messageType,
            attachmentUrl: `/uploads/chat/${req.file.filename}`,
            attachmentName: req.file.originalname,
            attachmentMime: req.file.mimetype,
        });

        broadcastMessage(message);
        return res.status(201).json({ message: "Attachment sent.", data: message });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Could not send attachment.",
        });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const scope = req.body?.scope === "everyone" ? "everyone" : "me";

        if (!mongoose.isValidObjectId(messageId)) {
            return res.status(400).json({ message: "Invalid message." });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const userId = String(req.user._id);
        const isParticipant = [String(message.sender), String(message.receiver)].includes(userId);
        if (!isParticipant) {
            return res.status(403).json({ message: "You cannot delete this message." });
        }

        if (!(await areFriends(message.sender, message.receiver))) {
            return res.status(403).json({ message: "You can only manage messages with accepted friends." });
        }

        if (scope === "everyone") {
            if (String(message.sender) !== userId) {
                return res.status(403).json({ message: "Only the sender can delete for everyone." });
            }
            removeChatAttachmentFile(message.attachmentUrl);
            await Message.findByIdAndDelete(messageId);
            broadcastMessageDeleted({
                messageId: message._id,
                sender: message.sender,
                receiver: message.receiver,
            });
            return res.json({
                message: "Message deleted for everyone.",
                data: { messageId: String(message._id), scope: "everyone" },
            });
        }

        await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: req.user._id } });
        return res.json({
            message: "Message deleted for you.",
            data: { messageId: String(message._id), scope: "me" },
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Could not delete message.",
        });
    }
};

const deleteConversation = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        if (!mongoose.isValidObjectId(otherUserId)) {
            return res.status(400).json({ message: "Invalid user." });
        }

        const filter = {
            $or: [
                { sender: req.user._id, receiver: otherUserId },
                { sender: otherUserId, receiver: req.user._id },
            ],
        };

        const messages = await Message.find(filter).select("attachmentUrl");
        messages.forEach((message) => removeChatAttachmentFile(message.attachmentUrl));
        await Message.deleteMany(filter);

        return res.json({ message: "Chat deleted." });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Could not delete chat.",
        });
    }
};

module.exports = { getConversation, sendChatAttachment, deleteMessage, deleteConversation };
