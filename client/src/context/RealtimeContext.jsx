import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "./UserContext";
import { API_URL } from "../api";
import { connectSocket } from "../services/socket";

export const RealtimeContext = createContext(null);

export const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return value;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const messagePreview = (message) => {
  if (message.text?.trim()) return message.text.trim();
  const type = message.messageType || "text";
  if (type === "image") return "Sent a photo";
  if (type === "video") return "Sent a video";
  if (type === "file") return message.attachmentName || "Sent a file";
  return "New message";
};

const RealtimeProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadByFriend, setUnreadByFriend] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [friendMap, setFriendMap] = useState({});
  const friendMapRef = useRef(friendMap);

  useEffect(() => {
    friendMapRef.current = friendMap;
  }, [friendMap]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const unreadMessageTotal = useMemo(
    () => Object.values(unreadByFriend).reduce((sum, count) => sum + count, 0),
    [unreadByFriend],
  );

  const badgeTotal = unreadNotificationCount + (unreadMessageTotal > 0 ? 1 : 0);

  const loadPendingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/api/friend-requests/received`, {
        withCredentials: true,
      });
      setPendingRequestCount(response.data.data.length);
    } catch {
      setPendingRequestCount(0);
    }
  }, [user]);

  const loadFriendMap = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/api/friends`, { withCredentials: true });
      const map = {};
      response.data.data.forEach((friend) => {
        map[String(friend._id)] = friend;
      });
      setFriendMap(map);
    } catch {
      setFriendMap({});
    }
  }, [user]);

  const addNotification = useCallback((entry) => {
    setNotifications((current) => [
      {
        id: makeId(),
        read: false,
        createdAt: Date.now(),
        ...entry,
      },
      ...current,
    ].slice(0, 50));
  }, []);

  const clearUnreadForFriend = useCallback((friendId) => {
    if (!friendId) return;
    const id = String(friendId);
    setUnreadByFriend((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    setNotifications((current) => current.map((item) => (
      item.type === "message" && String(item.fromUserId) === id
        ? { ...item, read: true }
        : item
    )));
  }, []);

  const isUserOnline = useCallback(
    (userId) => onlineUsers.has(String(userId)),
    [onlineUsers],
  );

  const isUserTyping = useCallback(
    (userId) => Boolean(typingUsers[String(userId)]),
    [typingUsers],
  );

  const getUnreadForFriend = useCallback(
    (friendId) => unreadByFriend[String(friendId)] || 0,
    [unreadByFriend],
  );

  const openNotificationPanel = useCallback(() => setPanelOpen(true), []);
  const closeNotificationPanel = useCallback(() => setPanelOpen(false), []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const handleNotificationAction = useCallback((notification) => {
    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, read: true } : item
    )));

    if (notification.type === "message") {
      clearUnreadForFriend(notification.fromUserId);
      navigate("/chat", {
        state: {
          selectedFriend: notification.fromUser || {
            _id: notification.fromUserId,
            userName: notification.fromUserName,
            name: notification.fromName,
          },
        },
      });
      setPanelOpen(false);
      return;
    }

    if (notification.type === "friend_request") {
      navigate("/chat");
      setPanelOpen(false);
    }
  }, [clearUnreadForFriend, navigate]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadByFriend({});
      setOnlineUsers(new Set());
      setTypingUsers({});
      setPendingRequestCount(0);
      return undefined;
    }

    loadPendingRequests();
    loadFriendMap();
    const socket = connectSocket();

    const onMessage = (message) => {
      const senderId = String(message.sender);
      const myId = String(user._id);
      if (senderId === myId) return;

      const friend = friendMapRef.current[senderId];
      const isActiveThread = activeChatUserId && senderId === String(activeChatUserId);
      if (!isActiveThread) {
        setUnreadByFriend((current) => ({
          ...current,
          [senderId]: (current[senderId] || 0) + 1,
        }));
        addNotification({
          type: "message",
          fromUserId: senderId,
          fromUserName: friend?.userName || "user",
          fromName: friend?.name || "Someone",
          fromUser: friend,
          preview: messagePreview(message),
        });
      }
    };

    const onFriendRequest = (payload) => {
      setPendingRequestCount((count) => count + 1);
      const from = payload?.from || {};
      addNotification({
        type: "friend_request",
        fromUserId: String(from._id),
        fromUserName: from.userName,
        fromName: from.name,
        preview: `@${from.userName} sent you a friend request`,
        requestId: payload?.requestId,
        fromUser: from,
      });
    };

    const onFriendRequestsChanged = () => {
      loadPendingRequests();
      loadFriendMap();
    };

    const onPresenceSync = ({ onlineUserIds }) => {
      setOnlineUsers(new Set((onlineUserIds || []).map(String)));
    };

    const onPresenceStatus = ({ userId, online }) => {
      const id = String(userId);
      setOnlineUsers((current) => {
        const next = new Set(current);
        if (online) next.add(id);
        else next.delete(id);
        return next;
      });
    };

    const onTypingStatus = ({ userId, typing }) => {
      const id = String(userId);
      setTypingUsers((current) => {
        if (!typing) {
          if (!current[id]) return current;
          const next = { ...current };
          delete next[id];
          return next;
        }
        return { ...current, [id]: true };
      });
    };

    socket.on("message:new", onMessage);
    socket.on("friend-request:received", onFriendRequest);
    socket.on("friend-requests:changed", onFriendRequestsChanged);
    socket.on("presence:sync", onPresenceSync);
    socket.on("presence:status", onPresenceStatus);
    socket.on("typing:status", onTypingStatus);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("friend-request:received", onFriendRequest);
      socket.off("friend-requests:changed", onFriendRequestsChanged);
      socket.off("presence:sync", onPresenceSync);
      socket.off("presence:status", onPresenceStatus);
      socket.off("typing:status", onTypingStatus);
    };
  }, [user, activeChatUserId, addNotification, loadPendingRequests, loadFriendMap]);

  const value = useMemo(() => ({
    notifications,
    unreadNotificationCount,
    unreadMessageTotal,
    unreadByFriend,
    badgeTotal,
    pendingRequestCount,
    panelOpen,
    openNotificationPanel,
    closeNotificationPanel,
    markNotificationsRead,
    handleNotificationAction,
    setActiveChatUserId,
    clearUnreadForFriend,
    isUserOnline,
    isUserTyping,
    getUnreadForFriend,
  }), [
    notifications,
    unreadNotificationCount,
    unreadMessageTotal,
    unreadByFriend,
    badgeTotal,
    pendingRequestCount,
    panelOpen,
    openNotificationPanel,
    closeNotificationPanel,
    markNotificationsRead,
    handleNotificationAction,
    clearUnreadForFriend,
    isUserOnline,
    isUserTyping,
    getUnreadForFriend,
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeProvider;
