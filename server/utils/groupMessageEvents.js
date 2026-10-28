const GroupMessage = require("../models/groupMessageModel");
const Group = require("../models/groupModel");
const { getGroupIfMember, canSendGroupMessage } = require("./groupChat");

let ioRef = null;

const setGroupMessageIo = (io) => {
    ioRef = io;
};

const broadcastGroupMessage = (message, memberIds) => {
    if (!ioRef || !message) return;
    ioRef.to(`group:${String(message.group)}`).emit("group:message:new", message);
    memberIds.forEach((memberId) => {
        ioRef.to(`user:${String(memberId)}`).emit("group:message:new", message);
    });
};

const broadcastGroupUpdated = (group, memberIds) => {
    if (!ioRef || !group) return;
    const payload = { groupId: String(group._id) };
    memberIds.forEach((memberId) => {
        ioRef.to(`user:${String(memberId)}`).emit("group:updated", payload);
    });
};

const broadcastGroupDeleted = (groupId, memberIds) => {
    if (!ioRef || !groupId) return;
    const payload = { groupId: String(groupId) };
    memberIds.forEach((memberId) => {
        ioRef.to(`user:${String(memberId)}`).emit("group:deleted", payload);
    });
    ioRef.to(`group:${String(groupId)}`).emit("group:deleted", payload);
};

const createGroupTextMessage = async (senderId, groupId, text) => {
    if (!text?.trim() || !groupId) {
        throw new Error("A group and message are required.");
    }
    const group = await getGroupIfMember(groupId, senderId);
    if (!group) throw new Error("Group not found.");
    if (!canSendGroupMessage(group, senderId)) {
        throw new Error("Only the group admin can send messages in this group.");
    }
    return GroupMessage.create({
        group: groupId,
        sender: senderId,
        text: text.trim(),
        messageType: "text",
    });
};

module.exports = {
    setGroupMessageIo,
    broadcastGroupMessage,
    broadcastGroupUpdated,
    broadcastGroupDeleted,
    createGroupTextMessage,
};
