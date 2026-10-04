import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import UserProfileSheet from "../components/UserProfileSheet";
import { connectSocket } from "../services/socket";
import { UserContext } from "./UserContext";

export const ProfileSheetContext = createContext(null);

export const useProfileSheet = () => {
  const value = useContext(ProfileSheetContext);
  if (!value) {
    throw new Error("useProfileSheet must be used within ProfileSheetProvider");
  }
  return value;
};

const ProfileSheetProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);

  const loadFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/friends`, { withCredentials: true });
      setFriends(response.data.data);
    } catch {
      setFriends([]);
    }
  }, [user]);

  const loadOutgoingRequests = useCallback(async () => {
    if (!user) {
      setPendingOutgoing([]);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/friend-requests/sent`, {
        withCredentials: true,
      });
      setPendingOutgoing(response.data.data);
    } catch {
      setPendingOutgoing([]);
    }
  }, [user]);

  const refreshSocialState = useCallback(async () => {
    await Promise.all([loadFriends(), loadOutgoingRequests()]);
  }, [loadFriends, loadOutgoingRequests]);

  useEffect(() => {
    refreshSocialState();
  }, [refreshSocialState]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = connectSocket();
    const onSocialUpdated = () => {
      refreshSocialState();
    };

    const onFriendRequestsChanged = () => {
      refreshSocialState();
    };

    socket.on("social:updated", onSocialUpdated);
    socket.on("friend-requests:changed", onFriendRequestsChanged);
    return () => {
      socket.off("social:updated", onSocialUpdated);
      socket.off("friend-requests:changed", onFriendRequestsChanged);
    };
  }, [user, refreshSocialState]);

  const friendIds = useMemo(
    () => new Set(friends.map((friend) => String(friend._id))),
    [friends],
  );

  const pendingRequestIds = useMemo(
    () => new Set(pendingOutgoing.map((person) => String(person._id))),
    [pendingOutgoing],
  );

  const openProfile = useCallback((person) => {
    if (!person?._id) return;
    if (user && String(person._id) === String(user._id)) {
      navigate("/profile");
      return;
    }
    setProfileUser(person);
  }, [navigate, user]);

  const closeProfile = useCallback(() => setProfileUser(null), []);

  const onFriendRequestSent = useCallback((userId) => {
    if (userId) {
      setPendingOutgoing((current) => {
        if (current.some((person) => String(person._id) === String(userId))) {
          return current;
        }
        if (profileUser && String(profileUser._id) === String(userId)) {
          return [...current, profileUser];
        }
        return current;
      });
    }
    loadOutgoingRequests();
  }, [loadOutgoingRequests, profileUser]);

  return (
    <ProfileSheetContext.Provider
      value={{
        openProfile,
        closeProfile,
        loadFriends,
        refreshSocialState,
        friendIds,
        pendingRequestIds,
      }}
    >
      {children}
      {profileUser ? (
        <UserProfileSheet
          open
          userPreview={profileUser}
          friendIds={friendIds}
          pendingRequestIds={pendingRequestIds}
          onClose={closeProfile}
          onFriendRequestSent={onFriendRequestSent}
          onFriendRequestCanceled={refreshSocialState}
        />
      ) : null}
    </ProfileSheetContext.Provider>
  );
};

export default ProfileSheetProvider;
