const Message = require("../models/messageModel");
const { areFriends } = require("./chat");

let ioRef = null;

const setMessageIo = (io) => {
    ioRef = io;
};

const broadcastMessage = (message) => {
    if (!ioRef || !message) return;
    ioRef.to(`user:${message.sender}`).emit("message:new", message);
    ioRef.to(`user:${message.receiver}`).emit("message:new", message);
};

const broadcastMessageDeleted = ({ messageId, sender, receiver }) => {
    if (!ioRef || !messageId) return;
    const payload = { messageId: String(messageId), scope: "everyone" };
    ioRef.to(`user:${sender}`).emit("message:deleted", payload);
    ioRef.to(`user:${receiver}`).emit("message:deleted", payload);
};

const createTextMessage = async (senderId, receiverId, text) => {
    if (!text?.trim() || !receiverId) {
        throw new Error("A recipient and message are required.");
    }
    if (!(await areFriends(senderId, receiverId))) {
        throw new Error("You can only chat with accepted friends.");
    }
    return Message.create({
        sender: senderId,
        receiver: receiverId,
        text: text.trim(),
        messageType: "text",
    });
};

module.exports = { setMessageIo, broadcastMessage, broadcastMessageDeleted, createTextMessage };
