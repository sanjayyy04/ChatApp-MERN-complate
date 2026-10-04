import { io } from "socket.io-client";
import { API_URL } from "../api";
import { getAuthToken } from "./authToken";

let socket = null;

export const connectSocket = () => {
    const token = getAuthToken();

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    socket = io(API_URL, {
        withCredentials: true,
        auth: token ? { token } : {},
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};