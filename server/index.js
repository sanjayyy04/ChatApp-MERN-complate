require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { setMessageIo, broadcastMessage, createTextMessage } = require("./utils/messageEvents");
const { setSocialIo, broadcastSocialUpdated, broadcastFriendRequestsChanged } = require("./utils/socialEvents");
const {
    setRealtimeIo,
    handleSocketConnection,
    handleSocketDisconnect,
} = require("./utils/realtime");

const app = require("./app");
const connectToDatabase = require("./config/db");
const { getClientOrigins } = require("./config/cors");
const FriendRequest = require("./models/friendRequestModel");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: getClientOrigins(),
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["polling", "websocket"],
});

io.use((socket, next) => {
    try {
        const fromAuth = socket.handshake.auth?.token;
        const fromCookie = cookie.parse(socket.handshake.headers.cookie || "").token;
        const token = fromAuth || fromCookie;
        if (!token) return next(new Error("Unauthorized"));
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

setMessageIo(io);
setSocialIo(io);
setRealtimeIo(io);

io.on("connection", async (socket) => {
    const userId = String(socket.user.id);
    socket.join(`user:${userId}`);
    console.log("User connected:", userId);

    try {
        const { onlineUserIds } = await handleSocketConnection(userId);
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
        io.to(`user:${receiverId}`).emit("typing:status", {
            userId: String(userId),
            typing: true,
        });
    });

    socket.on("typing:stop", ({ receiverId }) => {
        if (!receiverId) return;
        io.to(`user:${receiverId}`).emit("typing:status", {
            userId: String(userId),
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

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
