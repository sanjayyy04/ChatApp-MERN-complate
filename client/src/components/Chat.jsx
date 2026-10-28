import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiCheck, FiFileText, FiImage, FiMoreVertical, FiPaperclip, FiSearch, FiSend, FiTrash2, FiVideo, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import { API_URL, fileUrl, userAvatarUrl } from "../api";
import { connectSocket, emitSocket } from "../services/socket";
import { useLocation, useNavigate } from "react-router-dom";
import MediaLightbox from "./MediaLightbox";
import UsernameLink from "./UsernameLink";
import { useProfileSheet } from "../context/ProfileSheetContext";
import { useRealtime } from "../context/RealtimeContext";
import PresenceStatus from "./PresenceStatus";
import { buildMessageTimeline, formatMessageTime } from "../utils/chatDates";
import NotificationBell from "./NotificationBell";
import UserSearchResults from "./UserSearchResults";
import { useUserSearch } from "../hooks/useUserSearch";

const MessageBody = ({ message, onOpenImageClick, onOpenVideoClick, onOpenFileClick }) => {
  const type = message.messageType || "text";
  const attachmentSrc = fileUrl(message.attachmentUrl);

  if (type === "video" && attachmentSrc) {
    return (
      <button type="button" className="crud-chat-message__media crud-chat-message__media--video" onClick={onOpenVideoClick}>
        <video src={attachmentSrc} muted playsInline preload="metadata" />
        {message.text ? <p>{message.text}</p> : null}
      </button>
    );
  }

  if (type === "image" && attachmentSrc) {
    return (
      <button type="button" className="crud-chat-message__media" onClick={onOpenImageClick}>
        <img src={attachmentSrc} alt={message.attachmentName || "Shared image"} />
        {message.text ? <p>{message.text}</p> : null}
      </button>
    );
  }

  if (type === "file" && attachmentSrc) {
    return (
      <button
        type="button"
        className="crud-chat-message__file"
        onClick={onOpenFileClick}
      >
        <FiPaperclip aria-hidden="true" />
        <span>{message.attachmentName || "Download file"}</span>
        {message.text ? <p>{message.text}</p> : null}
      </button>
    );
  }

  return message.text ? <p>{message.text}</p> : null;
};

const LONG_PRESS_MS = 550;

const useLongPress = (onLongPress) => {
  const timerRef = useRef(null);
  const suppressClickRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((event) => {
    if (event.type === "mousedown" && event.button !== 0) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      onLongPress();
      clearTimer();
    }, LONG_PRESS_MS);
  }, [clearTimer, onLongPress]);

  const end = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const wrapClick = useCallback((handler) => (event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    handler?.(event);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: end,
    onTouchCancel: end,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: end,
    wrapClick,
  };
};

const ChatMessage = ({
  message,
  isSent,
  isSelected,
  selectionActive,
  onLongPress,
  onToggleSelect,
  onOpenImage,
  onOpenVideo,
  onOpenFile,
}) => {
  const longPress = useLongPress(onLongPress);
  const attachmentSrc = fileUrl(message.attachmentUrl);

  const onContextMenu = (event) => {
    event.preventDefault();
    onLongPress();
  };

  const openImage = longPress.wrapClick(() => onOpenImage(attachmentSrc, message.attachmentName));
  const openVideo = longPress.wrapClick(() => onOpenVideo(attachmentSrc, message.attachmentName));
  const openFile = longPress.wrapClick(() => onOpenFile(attachmentSrc, message.attachmentName));

  return (
    <div
      className={`crud-chat-message ${isSent ? "crud-chat-message--sent" : "crud-chat-message--received"}${isSelected ? " crud-chat-message--selected" : ""}${selectionActive ? " crud-chat-message--select-mode" : ""}`}
      onContextMenu={onContextMenu}
      onClick={longPress.wrapClick(() => {
        if (selectionActive) onToggleSelect();
      })}
      onTouchStart={longPress.onTouchStart}
      onTouchEnd={longPress.onTouchEnd}
      onTouchMove={longPress.onTouchMove}
      onTouchCancel={longPress.onTouchCancel}
      onMouseDown={longPress.onMouseDown}
      onMouseUp={longPress.onMouseUp}
      onMouseLeave={longPress.onMouseLeave}
      role="group"
      aria-label="Chat message"
      aria-selected={isSelected}
    >
      {selectionActive && (
        <span className={`crud-chat-message__check${isSelected ? " crud-chat-message__check--on" : ""}`} aria-hidden="true">
          {isSelected ? <FiCheck /> : null}
        </span>
      )}
      <div className="crud-chat-message__content">
        <MessageBody
          message={message}
          onOpenImageClick={selectionActive ? undefined : openImage}
          onOpenVideoClick={selectionActive ? undefined : openVideo}
          onOpenFileClick={selectionActive ? undefined : openFile}
        />
        <time
          className="crud-chat-message__time"
          dateTime={message.createdAt || undefined}
        >
          {formatMessageTime(message.createdAt || message.updatedAt)}
        </time>
      </div>
    </div>
  );
};

const ChatDateDivider = ({ label }) => (
  <div className="crud-chat-date-divider" role="separator" aria-label={label}>
    <span>{label}</span>
  </div>
);

const ChatFriendContact = ({
  friend,
  active,
  onSelect,
  onLongPress,
  isUserOnline,
  isUserTyping,
  getUnreadForFriend,
}) => {
  const longPress = useLongPress(onLongPress);
  return (
    <button
      type="button"
      className={`crud-chat-contact ${active ? "crud-chat-contact--active" : ""}`}
      onClick={longPress.wrapClick(() => onSelect(friend))}
      onContextMenu={(event) => {
        event.preventDefault();
        onLongPress();
      }}
      onTouchStart={longPress.onTouchStart}
      onTouchEnd={longPress.onTouchEnd}
      onTouchMove={longPress.onTouchMove}
      onTouchCancel={longPress.onTouchCancel}
      onMouseDown={longPress.onMouseDown}
      onMouseUp={longPress.onMouseUp}
      onMouseLeave={longPress.onMouseLeave}
    >
      <span className="crud-chat-contact__avatar-wrap">
        <img src={userAvatarUrl(friend)} alt="" />
        {isUserOnline(friend._id) && <span className="crud-chat-contact__online" aria-hidden="true" />}
      </span>
      <span className="crud-chat-contact__meta">
        <span className="crud-chat-contact__username">@{friend.userName}</span>
        <small>
          <PresenceStatus
            online={isUserOnline(friend._id)}
            typing={isUserTyping(friend._id)}
            className="crud-chat-contact__presence"
          />
          {!isUserOnline(friend._id) && !isUserTyping(friend._id) ? friend.name : null}
        </small>
      </span>
      {getUnreadForFriend(friend._id) > 0 && (
        <span className="crud-chat-contact__badge" aria-label="Unread messages">
          {getUnreadForFriend(friend._id)}
        </span>
      )}
    </button>
  );
};

const Chat = () => {
  const { user } = useContext(UserContext);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendSheetFriend, setFriendSheetFriend] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [friendListQuery, setFriendListQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { closeProfile, openProfile, friendIds, pendingRequestIds, refreshSocialState } = useProfileSheet();
  const { results: peopleSearchResults, loading: peopleSearchLoading, error: peopleSearchError, minLength: peopleSearchMin } = useUserSearch(friendListQuery, {
    enabled: Boolean(user),
    excludeFriendIds: friendIds,
  });
  const {
    setActiveChatUserId,
    clearUnreadForFriend,
    getUnreadForFriend,
    isUserOnline,
    isUserTyping,
    pendingRequestCount,
  } = useRealtime();
  const typingStopTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollThreadToBottomRef = useRef(true);

  const loadContacts = async () => {
    const [friendsResponse, requestsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/friends`, { withCredentials: true }),
      axios.get(`${API_URL}/api/friend-requests/received`, { withCredentials: true }),
    ]);
    setFriends(friendsResponse.data.data);
    setRequests(requestsResponse.data.data);
  };

  useEffect(() => {
    if (!user) return;
    loadContacts().catch(() => toast.error("Could not load chat contacts."));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const socket = connectSocket();
    const onFriendRequestsChanged = () => {
      loadContacts().catch(() => {});
    };
    const onUserUpdated = ({ user: updatedUser }) => {
      if (!updatedUser?._id) return;
      const id = String(updatedUser._id);
      setFriends((current) => current.map((friend) => (
        String(friend._id) === id ? { ...friend, ...updatedUser } : friend
      )));
      setSelectedFriend((current) => (
        current && String(current._id) === id ? { ...current, ...updatedUser } : current
      ));
    };
    socket.on("friend-requests:changed", onFriendRequestsChanged);
    socket.on("user:updated", onUserUpdated);
    return () => {
      socket.off("friend-requests:changed", onFriendRequestsChanged);
      socket.off("user:updated", onUserUpdated);
    };
  }, [user]);

  const openFriendChat = useCallback((friend) => {
    closeProfile();
    setSelectedFriend(friend);
  }, [closeProfile]);

  useEffect(() => {
    const person = location.state?.selectedFriend;
    if (person?._id) {
      closeProfile();
      setSelectedFriend(person);
      navigate("/chats", { replace: true, state: null });
      return;
    }
    if (location.state?.resetThread) {
      setSelectedFriend(null);
      navigate("/chats", { replace: true, state: null });
    }
  }, [location.state, closeProfile, navigate]);

  useEffect(() => {
    setSelectedMessageIds([]);
    setDeleteSheetOpen(false);
    scrollThreadToBottomRef.current = true;
  }, [selectedFriend?._id]);

  useEffect(() => {
    if (!selectedFriend) return undefined;
    const behavior = scrollThreadToBottomRef.current ? "auto" : "smooth";
    scrollThreadToBottomRef.current = false;
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, selectedFriend]);

  useEffect(() => {
    if (selectedFriend?._id) {
      setActiveChatUserId(selectedFriend._id);
      clearUnreadForFriend(selectedFriend._id);
    } else {
      setActiveChatUserId(null);
    }
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      if (selectedFriend?._id) {
        emitSocket("typing:stop", { receiverId: selectedFriend._id });
      }
    };
  }, [selectedFriend, setActiveChatUserId, clearUnreadForFriend]);

  const emitTyping = (isTyping) => {
    if (!selectedFriend) return;
    emitSocket(
      isTyping ? "typing:start" : "typing:stop",
      { receiverId: selectedFriend._id },
    );
  };

  const patchFriendInState = (friendId) => {
    setFriends((current) => current.filter((friend) => String(friend._id) !== String(friendId)));
    if (selectedFriend && String(selectedFriend._id) === String(friendId)) {
      setSelectedFriend(null);
      setMessages([]);
    }
    clearUnreadForFriend(friendId);
  };

  const deleteChatWithFriend = async (friendId) => {
    await axios.delete(`${API_URL}/api/messages/conversation/${friendId}`, {
      withCredentials: true,
    });
    if (selectedFriend && String(selectedFriend._id) === String(friendId)) {
      setMessages([]);
    }
  };

  const unfollowFriend = async (friendId) => {
    await axios.delete(`${API_URL}/api/friends/${friendId}`, { withCredentials: true });
    patchFriendInState(friendId);
  };

  const runFriendSheetAction = async (action) => {
    const friend = friendSheetFriend;
    if (!friend || friendActionLoading) return;
    setFriendActionLoading(true);
    try {
      if (action === "unfollow_chat") {
        await deleteChatWithFriend(friend._id);
        await unfollowFriend(friend._id);
        toast.success("Unfollowed and chat deleted.");
      } else if (action === "unfollow") {
        await unfollowFriend(friend._id);
        toast.success("Unfollowed.");
      } else if (action === "delete_chat") {
        await deleteChatWithFriend(friend._id);
        toast.success("Chat deleted.");
      }
      setFriendSheetFriend(null);
      await loadContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleComposerChange = (event) => {
    setText(event.target.value);
    emitTyping(true);
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const syncThreadClass = () => {
      document.body.classList.toggle(
        "crud-chat-thread-open",
        mq.matches && Boolean(selectedFriend),
      );
    };
    syncThreadClass();
    mq.addEventListener("change", syncThreadClass);
    return () => {
      mq.removeEventListener("change", syncThreadClass);
      document.body.classList.remove("crud-chat-thread-open");
    };
  }, [selectedFriend]);

  useEffect(() => {
    if (!selectedFriend) {
      setMessages([]);
      return;
    }
    axios.get(`${API_URL}/api/messages/${selectedFriend._id}`, { withCredentials: true })
      .then((response) => setMessages(response.data.data))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load messages."));
  }, [selectedFriend]);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    const receiveMessage = (message) => {
      const isOpenConversation = selectedFriend && (
        String(message.sender) === String(selectedFriend._id) ||
        String(message.receiver) === String(selectedFriend._id)
      );
      if (isOpenConversation) {
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      }
    };
    const onMessageDeleted = ({ messageId }) => {
      const id = String(messageId);
      setMessages((current) => current.filter((item) => String(item._id) !== id));
      setSelectedMessageIds((current) => current.filter((item) => item !== id));
    };

    socket.on("message:new", receiveMessage);
    socket.on("message:deleted", onMessageDeleted);
    return () => {
      socket.off("message:new", receiveMessage);
      socket.off("message:deleted", onMessageDeleted);
    };
  }, [user, selectedFriend]);

  const respondToRequest = async (requestId, action) => {
    emitSocket("friend-request:respond", { requestId, action }, (result) => {
      if (!result?.ok) return toast.error(result?.message || "Could not update request.");
      toast.success(`Friend request ${action}ed.`);
      loadContacts();
    });
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim() || !selectedFriend) return;
    emitSocket("message:send", { receiverId: selectedFriend._id, text }, (result) => {
      if (!result?.ok) toast.error(result?.message || "Could not send message.");
    });
    setText("");
    emitTyping(false);
  };

  const uploadAttachment = async (file) => {
    if (!file || !selectedFriend) return;
    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("attachment", file);
      if (text.trim()) payload.append("caption", text.trim());
      const response = await axios.post(
        `${API_URL}/api/messages/${selectedFriend._id}/attachment`,
        payload,
        { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } },
      );
      setMessages((current) => (
        current.some((item) => item._id === response.data.data._id)
          ? current
          : [...current, response.data.data]
      ));
      setText("");
      toast.success("Attachment sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send attachment.");
    } finally {
      setUploading(false);
    }
  };

  const onPickAttachment = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAttachSheetOpen(false);
    if (file) uploadAttachment(file);
  };

  const openAttachPicker = (inputRef) => {
    setAttachSheetOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.click());
  };

  const selectionActive = selectedMessageIds.length > 0;

  const clearSelection = () => {
    setSelectedMessageIds([]);
    setDeleteSheetOpen(false);
  };

  const closeThread = () => {
    clearSelection();
    setAttachSheetOpen(false);
    setSelectedFriend(null);
  };

  const startMessageSelection = (message) => {
    const id = String(message._id);
    setSelectedMessageIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const toggleMessageSelection = (message) => {
    const id = String(message._id);
    setSelectedMessageIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const removeMessagesLocally = (messageIds) => {
    const idSet = new Set(messageIds.map(String));
    setMessages((current) => current.filter((item) => !idSet.has(String(item._id))));
    setSelectedMessageIds([]);
    setDeleteSheetOpen(false);
  };

  const selectedMessages = messages.filter((message) => selectedMessageIds.includes(String(message._id)));
  const canDeleteForEveryone = selectedMessages.length > 0
    && selectedMessages.every((message) => String(message.sender) === String(user._id));

  const deleteSelectedMessages = async (scope) => {
    if (!selectedMessages.length || deletingMessage) return;
    setDeletingMessage(true);
    try {
      const idsToDelete = scope === "everyone"
        ? selectedMessages
          .filter((message) => String(message.sender) === String(user._id))
          .map((message) => message._id)
        : selectedMessages.map((message) => message._id);

      for (const messageId of idsToDelete) {
        await axios.delete(`${API_URL}/api/messages/${messageId}`, {
          withCredentials: true,
          data: { scope },
        });
      }
      removeMessagesLocally(idsToDelete);
      toast.success(
        scope === "everyone"
          ? `${idsToDelete.length} message(s) deleted for everyone.`
          : `${idsToDelete.length} message(s) deleted for you.`,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete messages.");
    } finally {
      setDeletingMessage(false);
    }
  };

  const onHeaderBack = () => {
    if (selectionActive) clearSelection();
    else closeThread();
  };

  const messageTimeline = useMemo(() => buildMessageTimeline(messages), [messages]);

  const filteredFriends = useMemo(() => {
    const query = friendListQuery.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((friend) => {
      const name = (friend.name || "").toLowerCase();
      const userName = (friend.userName || "").toLowerCase();
      return name.includes(query) || userName.includes(query);
    });
  }, [friends, friendListQuery]);

  const sendFriendRequestTo = async (userId, event) => {
    event?.stopPropagation();
    try {
      await axios.post(`${API_URL}/api/friend-requests/${userId}`, {}, { withCredentials: true });
      toast.success("Friend request sent.");
      refreshSocialState();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send request.");
    }
  };

  const cancelFriendRequestTo = async (userId, event) => {
    event?.stopPropagation();
    try {
      await axios.delete(`${API_URL}/api/friend-requests/${userId}`, { withCredentials: true });
      toast.success("Request cancelled.");
      refreshSocialState();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel request.");
    }
  };

  if (!user) return null;

  const threadOpen = Boolean(selectedFriend);

  return (
    <main className={`crud-chat-page${threadOpen ? " crud-chat-page--thread-open" : ""}`}>
      <MediaLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        src={lightbox?.src}
        alt={lightbox?.alt}
        downloadHref={lightbox?.href}
        downloadName={lightbox?.name}
        mode={lightbox?.mode || "image"}
      />

      {friendSheetFriend && (
        <div
          className="crud-chat-message-sheet"
          role="presentation"
          onClick={() => !friendActionLoading && setFriendSheetFriend(null)}
        >
          <div
            className="crud-chat-message-sheet__panel"
            role="dialog"
            aria-label={`Actions for ${friendSheetFriend.userName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="crud-chat-message-sheet__hint">@{friendSheetFriend.userName}</p>
            <button
              type="button"
              className="crud-chat-message-sheet__action crud-chat-message-sheet__action--danger"
              disabled={friendActionLoading}
              onClick={() => runFriendSheetAction("unfollow_chat")}
            >
              Unfollow & delete chat
            </button>
            <button
              type="button"
              className="crud-chat-message-sheet__action"
              disabled={friendActionLoading}
              onClick={() => runFriendSheetAction("unfollow")}
            >
              Unfollow only
            </button>
            <button
              type="button"
              className="crud-chat-message-sheet__action"
              disabled={friendActionLoading}
              onClick={() => runFriendSheetAction("delete_chat")}
            >
              Delete chat only
            </button>
            <button
              type="button"
              className="crud-chat-message-sheet__action crud-chat-message-sheet__action--cancel"
              disabled={friendActionLoading}
              onClick={() => setFriendSheetFriend(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {attachSheetOpen && (
        <div
          className="crud-chat-message-sheet crud-chat-attach-sheet"
          role="presentation"
          onClick={() => !uploading && setAttachSheetOpen(false)}
        >
          <div
            className="crud-chat-message-sheet__panel crud-chat-attach-sheet__panel"
            role="dialog"
            aria-label="Send attachment"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="crud-chat-message-sheet__hint">Send attachment</p>
            <div className="crud-chat-attach-sheet__options">
              <button
                type="button"
                className="crud-chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(imageInputRef)}
              >
                <span className="crud-chat-attach-sheet__icon" aria-hidden="true">
                  <FiImage />
                </span>
                Photos
              </button>
              <button
                type="button"
                className="crud-chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(videoInputRef)}
              >
                <span className="crud-chat-attach-sheet__icon crud-chat-attach-sheet__icon--video" aria-hidden="true">
                  <FiVideo />
                </span>
                Videos
              </button>
              <button
                type="button"
                className="crud-chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(documentInputRef)}
              >
                <span className="crud-chat-attach-sheet__icon crud-chat-attach-sheet__icon--doc" aria-hidden="true">
                  <FiFileText />
                </span>
                Document
              </button>
            </div>
            <button
              type="button"
              className="crud-chat-message-sheet__action crud-chat-message-sheet__action--cancel"
              disabled={uploading}
              onClick={() => setAttachSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteSheetOpen && (
        <div
          className="crud-chat-message-sheet"
          role="presentation"
          onClick={() => !deletingMessage && setDeleteSheetOpen(false)}
        >
          <div
            className="crud-chat-message-sheet__panel"
            role="dialog"
            aria-label="Delete messages"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="crud-chat-message-sheet__hint">
              Delete {selectedMessageIds.length} message{selectedMessageIds.length === 1 ? "" : "s"}?
            </p>
            {canDeleteForEveryone && (
              <button
                type="button"
                className="crud-chat-message-sheet__action crud-chat-message-sheet__action--danger"
                disabled={deletingMessage}
                onClick={() => deleteSelectedMessages("everyone")}
              >
                Delete for everyone
              </button>
            )}
            <button
              type="button"
              className="crud-chat-message-sheet__action crud-chat-message-sheet__action--danger"
              disabled={deletingMessage}
              onClick={() => deleteSelectedMessages("me")}
            >
              Delete for me
            </button>
            <button
              type="button"
              className="crud-chat-message-sheet__action crud-chat-message-sheet__action--cancel"
              disabled={deletingMessage}
              onClick={() => setDeleteSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className={`crud-chat-layout${threadOpen ? " crud-chat-layout--thread-open" : ""}`}>
        <aside className="crud-chat-sidebar" aria-label="Chat contacts">
          <header className="crud-chat-sidebar__toolbar">
            <h2 className="crud-chat-sidebar__title">Chats</h2>
            <div className="crud-chat-sidebar__toolbar-actions">
              <NotificationBell />
              <button type="button" className="crud-chat-sidebar__menu-btn" aria-label="Menu" title="Menu">
                <FiMoreVertical size={20} />
              </button>
            </div>
          </header>
          <label className="crud-chat-sidebar__search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={friendListQuery}
              onChange={(event) => setFriendListQuery(event.target.value)}
              placeholder="Search or start a new chat"
              autoComplete="off"
            />
          </label>
          <div className="crud-chat-sidebar__body">
          {friendListQuery.trim().length >= peopleSearchMin && (
            <section className="crud-chat-sidebar__people" aria-label="Search people">
              <h3 className="crud-chat-sidebar__section-title">People</h3>
              <UserSearchResults
                compact
                results={peopleSearchResults}
                loading={peopleSearchLoading}
                error={peopleSearchError}
                query={friendListQuery}
                minLength={peopleSearchMin}
                friendIds={friendIds}
                pendingRequestIds={pendingRequestIds}
                onOpenProfile={openProfile}
                onOpenChat={openFriendChat}
                onSendRequest={sendFriendRequestTo}
                onCancelRequest={cancelFriendRequestTo}
              />
            </section>
          )}
          {requests.length > 0 && !friendListQuery.trim() && (
            <>
              <h3 className="crud-chat-sidebar__requests-title">
                Requests
                {pendingRequestCount > 0 && (
                  <span className="crud-chat-sidebar__requests-badge">{pendingRequestCount}</span>
                )}
              </h3>
              {requests.map((request) => (
                <div className="crud-chat-request" key={request._id}>
                  <UsernameLink person={request.from} />
                  <button type="button" onClick={() => respondToRequest(request._id, "accept")}>Accept</button>
                  <button type="button" onClick={() => respondToRequest(request._id, "reject")}>Reject</button>
                </div>
              ))}
            </>
          )}
          {!friendListQuery.trim() ? (
            <h3 className="crud-chat-sidebar__section-title">Chats</h3>
          ) : null}
          {filteredFriends.length ? filteredFriends.map((friend) => (
            <ChatFriendContact
              key={friend._id}
              friend={friend}
              active={selectedFriend?._id === friend._id}
              onSelect={openFriendChat}
              onLongPress={() => setFriendSheetFriend(friend)}
              isUserOnline={isUserOnline}
              isUserTyping={isUserTyping}
              getUnreadForFriend={getUnreadForFriend}
            />
          )) : (
            <p className="crud-chat-sidebar__hint">
              {friends.length ? "No chats match your search." : "No accepted friends yet."}
            </p>
          )}
          </div>
        </aside>

        <section className="crud-chat-panel" aria-label="Chat conversation">
          {selectedFriend ? (
            <>
              <header className={`crud-chat-thread-header${selectionActive ? " crud-chat-thread-header--select" : ""}`}>
                <button
                  type="button"
                  className="crud-chat-back"
                  onClick={onHeaderBack}
                  aria-label={selectionActive ? "Cancel selection" : "Back to chats"}
                >
                  {selectionActive ? <FiX size={22} /> : <FiArrowLeft size={22} />}
                </button>
                {!selectionActive && (
                  <button
                    type="button"
                    className="crud-chat-thread-header__avatar-btn"
                    onClick={() => openProfile(selectedFriend)}
                    aria-label={`View ${selectedFriend.userName}'s profile`}
                  >
                    <img
                      className="crud-chat-thread-header__avatar"
                      src={userAvatarUrl(selectedFriend)}
                      alt=""
                    />
                  </button>
                )}
                <div className="crud-chat-thread-header__meta">
                  {selectionActive ? (
                    <>
                      <strong>{selectedMessageIds.length} selected</strong>
                      <span>Tap messages to select more</span>
                    </>
                  ) : (
                    <>
                      <strong>
                        <UsernameLink person={selectedFriend} className="crud-chat-username-link--header" />
                      </strong>
                      <PresenceStatus
                        online={isUserOnline(selectedFriend._id)}
                        typing={isUserTyping(selectedFriend._id)}
                        className="crud-chat-thread-header__presence"
                      />
                      {!isUserTyping(selectedFriend._id) && !isUserOnline(selectedFriend._id) && (
                        <span>{selectedFriend.name}</span>
                      )}
                      {!isUserTyping(selectedFriend._id) && isUserOnline(selectedFriend._id) && (
                        <span className="crud-chat-thread-header__name-muted">{selectedFriend.name}</span>
                      )}
                    </>
                  )}
                </div>
                {selectionActive && (
                  <button
                    type="button"
                    className="crud-chat-thread-header__delete"
                    onClick={() => setDeleteSheetOpen(true)}
                    disabled={deletingMessage}
                    aria-label="Delete selected messages"
                  >
                    <FiTrash2 size={20} />
                  </button>
                )}
              </header>
              <div className="crud-chat-messages">
                {messageTimeline.map((item) => {
                  if (item.kind === "date") {
                    return <ChatDateDivider key={item.id} label={item.label} />;
                  }
                  const message = item.message;
                  return (
                    <ChatMessage
                      key={item.id}
                      message={message}
                      isSent={String(message.sender) === String(user._id)}
                      isSelected={selectedMessageIds.includes(String(message._id))}
                      selectionActive={selectionActive}
                      onLongPress={() => startMessageSelection(message)}
                      onToggleSelect={() => toggleMessageSelection(message)}
                      onOpenImage={(src, alt) => setLightbox({ src, alt, mode: "image" })}
                      onOpenVideo={(src, alt) => setLightbox({ src, alt, mode: "video" })}
                      onOpenFile={(href, name) => setLightbox({ href, name, mode: "file" })}
                    />
                  );
                })}
                <div ref={messagesEndRef} className="crud-chat-messages__anchor" aria-hidden="true" />
              </div>
              <form className={`crud-chat-composer${selectionActive ? " crud-chat-composer--hidden" : ""}`} onSubmit={sendMessage}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={onPickAttachment}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  hidden
                  onChange={onPickAttachment}
                />
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.txt,.zip,.doc,.docx,application/pdf,text/plain,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={onPickAttachment}
                />
                <button
                  type="button"
                  className="crud-chat-composer__attach"
                  onClick={() => setAttachSheetOpen(true)}
                  disabled={uploading}
                  aria-label="Attach photos, videos, or documents"
                  aria-expanded={attachSheetOpen}
                >
                  <FiPaperclip />
                </button>
                <input
                  className="crud-chat-composer__input"
                  value={text}
                  onChange={handleComposerChange}
                  placeholder={uploading ? "Uploading..." : "Write a message..."}
                  maxLength="2000"
                  disabled={uploading}
                />
                <button className="crud-chat-composer__send" type="submit" disabled={uploading} aria-label="Send message">
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <div className="crud-chat-empty crud-chat-empty--desktop">Choose an accepted friend to start chatting.</div>
          )}
        </section>
      </section>
    </main>
  );
};

export default Chat;
