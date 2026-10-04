import { io } from "socket.io-client";
import { API_URL } from "../api";

let socket = null;

export const connectSocket = () => {
    if (!socket) {
        socket = io(API_URL, {
            withCredentials: true,
        });
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};