import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import { connectSocket, disconnectSocket } from "../services/socket";
import { clearAuthToken, getAuthToken } from "../services/authToken";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadUserFromCookie = async () => {
      if (!getAuthToken()) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      try {
        const response = await axios.get(`${API_URL}/api/profile`, {
          withCredentials: true,
          signal: controller.signal,
        });

        setUser(response.data.data);
      } catch (error) {
        clearAuthToken();
        setUser(null);
      } finally {
        window.clearTimeout(timeoutId);
        setAuthLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  useEffect(() => {
    const onPageHide = () => disconnectSocket();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      disconnectSocket();
      return;
    }

    connectSocket();
  }, [user, authLoading]);

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

      navigate("/login");
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
