import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import { connectSocket, disconnectSocket } from "../services/socket";
import { clearAuthToken } from "../services/authToken";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const navigate = useNavigate();

  // Check whether user is already logged in
  useEffect(() => {
    const loadUserFromCookie = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/profile`, {
          withCredentials: true,
        });

        setUser(response.data.data);
      } catch (error) {
        clearAuthToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  // Connect Socket.IO when authenticated user exists
  useEffect(() => {
    // Still checking authentication
    if (authLoading) {
      return;
    }

    // User is not logged in
    if (!user) {
      disconnectSocket();
      return;
    }

    // User is logged in
    const socket = connectSocket();

    const handleConnect = () => {
      console.log("User connected to Socket.IO:", socket.id);
    };

    const handleDisconnect = () => {
      console.log("User disconnected from Socket.IO");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Cleanup
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [user, authLoading]);

  // Logout
  const logout = async () => {
    try {
      await axios.post(
        `${API_URL}/api/logout`,
        {},
        {
          withCredentials: true,
        },
      );

      disconnectSocket();
      clearAuthToken();
      setUser(null);

      // Redirect
      navigate("/reg");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        setUsers,
        user,
        setUser,
        authLoading,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
