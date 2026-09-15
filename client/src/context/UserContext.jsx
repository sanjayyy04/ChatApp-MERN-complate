import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadUserFromCookie = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/profile`, {
          withCredentials: true,
        });

        setUser(response.data.data);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  const logout = async () => {
    await axios.post(`${API_URL}/api/logout`, {}, { withCredentials: true });
    setUser(null);
    navigate("/reg");
  };

  return (
    <UserContext.Provider
      value={{ users, setUsers, user, setUser, authLoading, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
