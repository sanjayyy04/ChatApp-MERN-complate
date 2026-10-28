const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Group = require("../models/groupModel");
const GroupMessage = require("../models/groupMessageModel");
const User = require("../models/userModel");
const { areFriends } = require("../utils/chat");
const { escapeRegex } = require("../utils/escapeRegex");
const { generateInviteCode } = require("../utils/groupInvite");
const {
    getGroupIfMember,
    isGroupAdmin,
    isMember,
    canSendGroupMessage,
    ensureFriendsForMembers,
    canAddMember,
    sanitizeGroupForClient,
} = require("../utils/groupChat");
const {
    broadcastGroupMessage,
    broadcastGroupUpdated,
    broadcastGroupDeleted,
} = require("../utils/groupMessageEvents");

const removeChatAttachmentFile = (attachmentUrl) => {
    if (!attachmentUrl?.startsWith("/uploads/chat/")) return;
    const filePath = path.join(__dirname, "..", attachmentUrl.replace(/^\//, ""));
    fs.unlink(filePath, () => {});
};

const memberIdsOf = (group) => group.members.map((member) => String(member._id || member));

const populateGroup = (query) => query
    .populate("admin", "-password")
    .populate("members", "-password")
    .populate("joinRequests.user", "-password");

const respondGroup = (group, viewerId, res, message, status = 200) => {
    const payload = sanitizeGroupForClient(group, viewerId);
    return res.status(status).json({ message, data: payload });
};

const listGroups = async (req, res) => {
    const groups = await Group.find({ members: req.user._id })
        .populate("admin", "-password")
        .populate("members", "-password")
        .sort({ updatedAt: -1 });
    return res.json({
        data: groups.map((group) => sanitizeGroupForClient(group, req.user._id)),
    });
};

const createGroup = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
        const isPrivate = req.body.isPrivate !== false;
        const requireJoinApproval = req.body.requireJoinApproval !== undefined
            ? Boolean(req.body.requireJoinApproval)
            : isPrivate;

        if (!name) return res.status(400).json({ message: "Group name is required." });

        const validMemberIds = memberIds.filter((id) => mongoose.isValidObjectId(id));
        const friendIds = await ensureFriendsForMembers(req.user._id, validMemberIds);
        const uniqueMembers = [req.user._id, ...friendIds];

        let inviteCode = generateInviteCode();
        for (let attempt = 0; attempt < 5; attempt += 1) {
            // eslint-disable-next-line no-await-in-loop
            const exists = await Group.exists({ inviteCode });
            if (!exists) break;
            inviteCode = generateInviteCode();
        }

        const group = await Group.create({
            name,
            admin: req.user._id,
            members: uniqueMembers,
            onlyAdminCanSend: false,
            isPrivate,
            requireJoinApproval,
            inviteCode,
        });

        const populated = await populateGroup(Group.findById(group._id));

        try {
            broadcastGroupUpdated(populated, memberIdsOf(populated));
        } catch (broadcastError) {
            console.error("group:updated broadcast failed:", broadcastError.message);
        }
        return respondGroup(populated, req.user._id, res, "Group created.", 201);
    } catch (error) {
        console.error("createGroup failed:", error);
        return res.status(500).json({ message: error.message || "Could not create group." });
    }
};

const getGroup = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.groupId)) {
        return res.status(404).json({ message: "Group not found." });
    }
    const group = await populateGroup(Group.findById(req.params.groupId));
    const doc = await group;
    if (!doc || !isMember(doc, req.user._id)) {
        return res.status(404).json({ message: "Group not found." });
    }
    if (isGroupAdmin(doc, req.user._id) && !doc.inviteCode) {
        doc.inviteCode = generateInviteCode();
        await Group.updateOne({ _id: doc._id }, { inviteCode: doc.inviteCode });
    }
    return respondGroup(doc, req.user._id, res, "Group loaded.");
};

const updateGroupSettings = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can change settings." });
        }

        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();
            if (!name) return res.status(400).json({ message: "Group name cannot be empty." });
            group.name = name;
        }
        if (req.body.onlyAdminCanSend !== undefined) {
            group.onlyAdminCanSend = Boolean(req.body.onlyAdminCanSend);
        }
        if (req.body.isPrivate !== undefined) {
            group.isPrivate = Boolean(req.body.isPrivate);
        }
        if (req.body.requireJoinApproval !== undefined) {
            group.requireJoinApproval = Boolean(req.body.requireJoinApproval);
        }

        await group.save();
        const populated = await populateGroup(Group.findById(group._id));
        broadcastGroupUpdated(populated, memberIdsOf(populated));
        return respondGroup(populated, req.user._id, res, "Group settings updated.");
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not update group." });
    }
};

const addGroupMembers = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can add members." });
        }

        if (!canAddMember(group)) {
            return res.status(403).json({ message: "This group is full." });
        }

        const incoming = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
        const validIds = incoming.filter((id) => mongoose.isValidObjectId(id));
        const friendIds = await ensureFriendsForMembers(req.user._id, validIds);
        const existing = new Set(group.members.map(String));
        friendIds.forEach((id) => existing.add(String(id)));
        group.members = [...existing];
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("admin", "-password")
            .populate("members", "-password");
        broadcastGroupUpdated(populated, memberIdsOf(populated));
        return res.json({ message: "Members added.", data: populated });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not add members." });
    }
};

const removeGroupMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user." });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        const requesterId = String(req.user._id);
        const targetId = String(userId);
        const adminId = String(group.admin);

        if (targetId === adminId) {
            return res.status(400).json({ message: "Cannot remove the group admin." });
        }

        const isAdmin = requesterId === adminId;
        const isSelf = requesterId === targetId;
        if (!isAdmin && !isSelf) {
            return res.status(403).json({ message: "You cannot remove this member." });
        }

        group.members = group.members.filter((member) => String(member) !== targetId);
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("admin", "-password")
            .populate("members", "-password");
        broadcastGroupUpdated(populated, [...memberIdsOf(populated), targetId]);
        return res.json({ message: "Member removed.", data: populated });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not remove member." });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can delete the group." });
        }

        const members = memberIdsOf(group);
        const messages = await GroupMessage.find({ group: group._id }).select("attachmentUrl");
        messages.forEach((message) => removeChatAttachmentFile(message.attachmentUrl));
        await GroupMessage.deleteMany({ group: group._id });
        await Group.findByIdAndDelete(group._id);
        broadcastGroupDeleted(group._id, members);
        return res.json({ message: "Group deleted." });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not delete group." });
    }
};

const getGroupMessages = async (req, res) => {
    const group = await getGroupIfMember(req.params.groupId, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const messages = await GroupMessage.find({
        group: group._id,
        deletedFor: { $nin: [req.user._id] },
    })
        .sort({ createdAt: 1 })
        .populate("sender", "-password");

    return res.json({ data: messages });
};

const sendGroupAttachment = async (req, res) => {
    try {
        const group = await getGroupIfMember(req.params.groupId, req.user._id);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!canSendGroupMessage(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can send messages in this group." });
        }
        if (!req.file) return res.status(400).json({ message: "Attachment is required." });

        let messageType = "file";
        if (req.file.mimetype.startsWith("image/")) messageType = "image";
        else if (req.file.mimetype.startsWith("video/")) messageType = "video";

        const message = await GroupMessage.create({
            group: group._id,
            sender: req.user._id,
            text: String(req.body.caption || "").trim().slice(0, 2000),
            messageType,
            attachmentUrl: `/uploads/chat/${req.file.filename}`,
            attachmentName: req.file.originalname,
            attachmentMime: req.file.mimetype,
        });

        const populated = await GroupMessage.findById(message._id).populate("sender", "-password");
        broadcastGroupMessage(populated, memberIdsOf(group));
        return res.status(201).json({ message: "Attachment sent.", data: populated });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not send attachment." });
    }
};

const searchFriendsForGroup = async (req, res) => {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json({ data: [] });

    const group = await getGroupIfMember(req.params.groupId, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isGroupAdmin(group, req.user._id)) {
        return res.status(403).json({ message: "Only the group admin can search members." });
    }

    const memberSet = new Set(group.members.map((m) => String(m._id || m)));
    const users = await User.find({
        userName: { $regex: escapeRegex(query), $options: "i" },
        _id: { $ne: req.user._id, $nin: [...memberSet] },
    }).select("-password").limit(15);

    const filtered = [];
    for (const candidate of users) {
        // eslint-disable-next-line no-await-in-loop
        if (await areFriends(req.user._id, candidate._id)) filtered.push(candidate);
    }

    return res.json({ data: filtered });
};

const listDiscoverableGroups = async (req, res) => {
    const query = String(req.query.q || "").trim();
    const filter = {
        isPrivate: false,
        members: { $nin: [req.user._id] },
    };
    if (query) {
        filter.name = { $regex: escapeRegex(query), $options: "i" };
    }
    const groups = await Group.find(filter)
        .select("name members isPrivate requireJoinApproval admin maxMembers createdAt")
        .populate("admin", "userName name")
        .sort({ updatedAt: -1 })
        .limit(40);
    return res.json({ data: groups });
};

const joinGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (isMember(group, req.user._id)) {
            return res.status(400).json({ message: "You are already in this group." });
        }
        if (!canAddMember(group)) {
            return res.status(403).json({ message: "This group is full." });
        }
        if (group.isPrivate) {
            return res.status(403).json({
                message: "Private groups require an invite link or admin approval.",
            });
        }

        if (group.requireJoinApproval) {
            const alreadyRequested = group.joinRequests.some(
                (request) => String(request.user) === String(req.user._id),
            );
            if (alreadyRequested) {
                return res.status(400).json({ message: "Join request already pending." });
            }
            group.joinRequests.push({ user: req.user._id });
            await group.save();
            broadcastGroupUpdated(group, [String(group.admin)]);
            return res.status(202).json({ message: "Join request sent to the group admin." });
        }

        group.members.push(req.user._id);
        await group.save();
        const populated = await populateGroup(Group.findById(group._id));
        broadcastGroupUpdated(populated, memberIdsOf(populated));
        return respondGroup(populated, req.user._id, res, "You joined the group.", 201);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not join group." });
    }
};

const joinGroupByInvite = async (req, res) => {
    try {
        const code = String(req.body.code || "").trim();
        if (!code || code.length > 64) {
            return res.status(400).json({ message: "A valid invite code is required." });
        }

        const group = await Group.findOne({ inviteCode: code });
        if (!group) return res.status(404).json({ message: "Invalid or expired invite link." });
        if (isMember(group, req.user._id)) {
            return res.status(400).json({ message: "You are already in this group." });
        }
        if (!canAddMember(group)) {
            return res.status(403).json({ message: "This group is full." });
        }

        if (group.isPrivate && !(await areFriends(req.user._id, group.admin))) {
            return res.status(403).json({
                message: "Private groups are invite-only for friends of the admin. Send a friend request first.",
            });
        }

        group.members.push(req.user._id);
        group.joinRequests = group.joinRequests.filter(
            (request) => String(request.user) !== String(req.user._id),
        );
        await group.save();
        const populated = await populateGroup(Group.findById(group._id));
        broadcastGroupUpdated(populated, memberIdsOf(populated));
        return respondGroup(populated, req.user._id, res, "You joined the group.", 201);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not join with invite." });
    }
};

const previewGroupInvite = async (req, res) => {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ message: "Invite code is required." });
    const group = await Group.findOne({ inviteCode: code }).select("name isPrivate");
    if (!group) return res.status(404).json({ message: "Invalid or expired invite link." });
    return res.json({
        data: {
            groupId: group._id,
            name: group.name,
            isPrivate: group.isPrivate,
            requiresLogin: true,
        },
    });
};

const listJoinRequests = async (req, res) => {
    const group = await populateGroup(Group.findById(req.params.groupId));
    const doc = await group;
    if (!doc || !isGroupAdmin(doc, req.user._id)) {
        return res.status(403).json({ message: "Only the group admin can view join requests." });
    }
    return res.json({ data: doc.joinRequests || [] });
};

const respondJoinRequest = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const action = req.body.action === "approve" ? "approve" : "reject";
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user." });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can respond to requests." });
        }

        const requestIndex = group.joinRequests.findIndex(
            (request) => String(request.user) === String(userId),
        );
        if (requestIndex === -1) {
            return res.status(404).json({ message: "Join request not found." });
        }

        group.joinRequests.splice(requestIndex, 1);

        if (action === "approve") {
            if (!canAddMember(group)) {
                return res.status(403).json({ message: "Group is full. Cannot approve more members." });
            }
            if (!isMember(group, userId)) {
                group.members.push(userId);
            }
        }

        await group.save();
        const populated = await populateGroup(Group.findById(group._id));
        broadcastGroupUpdated(populated, [...memberIdsOf(populated), String(userId)]);
        return respondGroup(
            populated,
            req.user._id,
            res,
            action === "approve" ? "Member approved." : "Join request rejected.",
        );
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not update join request." });
    }
};

const regenerateGroupInvite = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "Only the group admin can rotate the invite link." });
        }

        let inviteCode = generateInviteCode();
        for (let attempt = 0; attempt < 5; attempt += 1) {
            // eslint-disable-next-line no-await-in-loop
            const exists = await Group.exists({ inviteCode, _id: { $ne: group._id } });
            if (!exists) break;
            inviteCode = generateInviteCode();
        }
        group.inviteCode = inviteCode;
        await group.save();
        const populated = await populateGroup(Group.findById(group._id));
        return respondGroup(populated, req.user._id, res, "Invite link rotated.");
    } catch (error) {
        return res.status(500).json({ message: error.message || "Could not rotate invite." });
    }
};

module.exports = {
    listGroups,
    createGroup,
    getGroup,
    updateGroupSettings,
    addGroupMembers,
    removeGroupMember,
    deleteGroup,
    getGroupMessages,
    sendGroupAttachment,
    searchFriendsForGroup,
    listDiscoverableGroups,
    joinGroup,
    joinGroupByInvite,
    previewGroupInvite,
    listJoinRequests,
    respondJoinRequest,
    regenerateGroupInvite,
};
