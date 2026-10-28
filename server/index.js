require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { setMessageIo, broadcastMessage, createTextMessage } = require("./utils/messageEvents");
const {
    setGroupMessageIo,
    createGroupTextMessage,
    broadcastGroupMessage,
} = require("./utils/groupMessageEvents");
const Group = require("./models/groupModel");
const GroupMessage = require("./models/groupMessageModel");
const { setSocialIo, broadcastSocialUpdated, broadcastFriendRequestsChanged } = require("./utils/socialEvents");
const {
    setRealtimeIo,
    handleSocketConnection,
    handleSocketDisconnect,
} = require("./utils/realtime");
const { cancelUnreadEmailDigest } = require("./services/unreadEmailNotificationService");

const app = require("./app");
const connectToDatabase = require("./config/db");
const { getClientOrigins } = require("./config/cors");
const FriendRequest = require("./models/friendRequestModel");
const User = require("./models/userModel");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: getClientOrigins(),
        credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
    transports: ["polling", "websocket"],
});

io.use(async (socket, next) => {
    try {
        const fromAuth = socket.handshake.auth?.token;
        const fromCookie = cookie.parse(socket.handshake.headers.cookie || "").token;
        const token = fromAuth || fromCookie;
        if (!token) return next(new Error("Unauthorized"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tokenType = decoded.typ || "session";
        if (tokenType !== "session") {
            return next(new Error("Unauthorized"));
        }
        const dbUser = await User.findById(decoded.id).select("sessionVersion");
        if (!dbUser) return next(new Error("Unauthorized"));
        if (decoded.sv !== undefined && Number(decoded.sv) !== Number(dbUser.sessionVersion || 0)) {
            return next(new Error("Unauthorized"));
        }
        socket.user = decoded;
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

setMessageIo(io);
setGroupMessageIo(io);
setSocialIo(io);
setRealtimeIo(io);

io.on("connection", async (socket) => {
    const userId = String(socket.user.id);
    socket.join(`user:${userId}`);
    console.log("User connected:", userId);

    try {
        const { onlineUserIds } = await handleSocketConnection(userId);
        await cancelUnreadEmailDigest(userId);
        socket.emit("presence:sync", { onlineUserIds });
    } catch (error) {
        console.error("Presence sync failed:", error.message);
    }

    socket.on("message:send", async ({ receiverId, text }, acknowledge) => {
        try {
            const message = await createTextMessage(socket.user.id, receiverId, text);
            broadcastMessage(message);
            acknowledge?.({ ok: true, data: message });
        } catch (error) {
            acknowledge?.({ ok: false, message: error.message || "Message could not be sent." });
        }
    });

    socket.on("group:subscribe", async (groupIds, acknowledge) => {
        try {
            if (!Array.isArray(groupIds)) throw new Error("Invalid groups.");
            const validIds = groupIds.filter((id) => id).map(String);
            const groups = await Group.find({
                _id: { $in: validIds },
                members: socket.user.id,
            }).select("_id");
            groups.forEach((group) => socket.join(`group:${String(group._id)}`));
            acknowledge?.({ ok: true, joined: groups.map((g) => String(g._id)) });
        } catch (error) {
            acknowledge?.({ ok: false, message: error.message || "Could not join groups." });
        }
    });

    socket.on("group:message:send", async ({ groupId, text }, acknowledge) => {
        try {
            const message = await createGroupTextMessage(socket.user.id, groupId, text);
            const group = await Group.findById(groupId).select("members");
            const memberIds = group?.members?.map((id) => String(id)) || [];
            const populated = await GroupMessage.findById(message._id).populate("sender", "-password");
            broadcastGroupMessage(populated, memberIds);
            acknowledge?.({ ok: true, data: populated });
        } catch (error) {
            acknowledge?.({ ok: false, message: error.message || "Message could not be sent." });
        }
    });

    socket.on("friend-request:respond", async ({ requestId, action }, acknowledge) => {
        try {
            if (!["accept", "reject"].includes(action)) throw new Error("Invalid request action.");
            const request = await FriendRequest.findOneAndUpdate(
                { _id: requestId, to: socket.user.id, status: "pending" },
                { status: action === "accept" ? "accepted" : "rejected" },
                { new: true },
            );
            if (!request) throw new Error("Pending friend request not found.");
            if (action === "accept") {
                broadcastSocialUpdated([request.from, request.to]);
            }
            broadcastFriendRequestsChanged([request.from, request.to]);
            acknowledge?.({ ok: true });
        } catch (error) {
            acknowledge?.({ ok: false, message: error.message || "Could not update request." });
        }
    });

    socket.on("typing:start", ({ receiverId }) => {
        if (!receiverId) return;
        io.to(`user:${String(receiverId)}`).emit("typing:status", {
            userId,
            typing: true,
        });
    });

    socket.on("typing:stop", ({ receiverId }) => {
        if (!receiverId) return;
        io.to(`user:${String(receiverId)}`).emit("typing:status", {
            userId,
            typing: false,
        });
    });

    socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);
        try {
            await handleSocketDisconnect(userId);
        } catch (error) {
            console.error("Presence disconnect failed:", error.message);
        }
    });
});



const startServer = async () => {
    await connectToDatabase();

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(
                `Port ${PORT} is already in use. Close the other terminal running the server, or set a different PORT in server/.env.`,
            );
            process.exit(1);
        }
        console.error("Server failed to start:", error.message);
        process.exit(1);
    });

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
