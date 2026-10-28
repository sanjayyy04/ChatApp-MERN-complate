const mongoose = require("mongoose");
const Group = require("../models/groupModel");
const { areFriends } = require("./chat");

const MAX_GROUP_MEMBERS = 256;

const isMember = (group, userId) => group.members.some(
    (member) => String(member._id || member) === String(userId),
);

const getGroupIfMember = async (groupId, userId) => {
    if (!mongoose.isValidObjectId(groupId)) return null;
    const group = await Group.findById(groupId).populate("members", "-password").populate("admin", "-password");
    if (!group) return null;
    if (!isMember(group, userId)) return null;
    return group;
};

const isGroupAdmin = (group, userId) => String(group.admin._id || group.admin) === String(userId);

const canSendGroupMessage = (group, userId) => {
    if (!group.onlyAdminCanSend) return true;
    return isGroupAdmin(group, userId);
};

const ensureFriendsForMembers = async (adminId, memberIds) => {
    const filtered = [];
    for (const memberId of memberIds) {
        // eslint-disable-next-line no-await-in-loop
        if (await areFriends(adminId, memberId)) filtered.push(memberId);
    }
    return filtered;
};

const canAddMember = (group) => group.members.length < Math.min(group.maxMembers || 100, MAX_GROUP_MEMBERS);

const sanitizeGroupForClient = (group, viewerId) => {
    const doc = group.toObject ? group.toObject() : { ...group };
    const isAdmin = isGroupAdmin(doc, viewerId);
    if (!isAdmin) {
        delete doc.inviteCode;
        doc.joinRequests = [];
    }
    return doc;
};

module.exports = {
    getGroupIfMember,
    isGroupAdmin,
    isMember,
    canSendGroupMessage,
    ensureFriendsForMembers,
    canAddMember,
    sanitizeGroupForClient,
    MAX_GROUP_MEMBERS,
};
