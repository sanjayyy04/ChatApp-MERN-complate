import { io } from "socket.io-client";
import { API_URL } from "../api";
import { getAuthToken } from "./authToken";

let socket = null;
let boundToken = null;
let idleSocket = null;

const createSocket = (token) => {
    return io(API_URL, {
        autoConnect: Boolean(token),
        withCredentials: true,
        auth: token ? { token } : {},
        // Polling first is more reliable on Render/proxies; then upgrade to WebSocket.
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });
};

/** Single shared Socket.IO connection for the whole app. */
export const connectSocket = () => {
    const token = getAuthToken();

    if (!token) {
        disconnectSocket();
        if (!idleSocket) {
            idleSocket = io(API_URL, { autoConnect: false });
        }
        return idleSocket;
    }

    if (socket && boundToken === token) {
        if (!socket.connected && !socket.active) {
            socket.connect();
        }
        return socket;
    }

    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    boundToken = token;
    socket = createSocket(token);
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        boundToken = null;
    }
};

export const getSocket = () => socket;

/** Emit after the shared socket is connected (avoids races on Render cold start). */
export const emitSocket = (event, data, ack) => {
    const socket = connectSocket();
    const fire = () => socket.emit(event, data, ack);
    if (socket.connected) {
        fire();
    } else {
        socket.once("connect", fire);
        if (!socket.active) {
            socket.connect();
        }
    }
};
