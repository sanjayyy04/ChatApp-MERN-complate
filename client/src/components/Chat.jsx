import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiCheck, FiFileText, FiImage, FiPaperclip, FiSend, FiTrash2, FiVideo, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import { API_URL, fileUrl, userAvatarUrl } from "../api";
import { connectSocket } from "../services/socket";
import { useLocation } from "react-router-dom";
import MediaLightbox from "./MediaLightbox";
import UsernameLink from "./UsernameLink";
import { useProfileSheet } from "../context/ProfileSheetContext";

const MessageBody = ({ message, onOpenImageClick, onOpenVideoClick, onOpenFileClick }) => {
  const type = message.messageType || "text";
  const attachmentSrc = fileUrl(message.attachmentUrl);

  if (type === "video" && attachmentSrc) {
    return (
      <button type="button" className="chat-message__media chat-message__media--video" onClick={onOpenVideoClick}>
        <video src={attachmentSrc} muted playsInline preload="metadata" />
        {message.text ? <p>{message.text}</p> : null}
      </button>
    );
  }

  if (type === "image" && attachmentSrc) {
    return (
      <button type="button" className="chat-message__media" onClick={onOpenImageClick}>
        <img src={attachmentSrc} alt={message.attachmentName || "Shared image"} />
        {message.text ? <p>{message.text}</p> : null}
      </button>
    );
  }

  if (type === "file" && attachmentSrc) {
    return (
      <button
        type="button"
        className="chat-message__file"
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
      className={`chat-message ${isSent ? "chat-message--sent" : "chat-message--received"}${isSelected ? " chat-message--selected" : ""}${selectionActive ? " chat-message--select-mode" : ""}`}
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
        <span className={`chat-message__check${isSelected ? " chat-message__check--on" : ""}`} aria-hidden="true">
          {isSelected ? <FiCheck /> : null}
        </span>
      )}
      <MessageBody
        message={message}
        onOpenImageClick={selectionActive ? undefined : openImage}
        onOpenVideoClick={selectionActive ? undefined : openVideo}
        onOpenFileClick={selectionActive ? undefined : openFile}
      />
    </div>
  );
};

const Chat = () => {
  const { user } = useContext(UserContext);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
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
  const location = useLocation();
  const { openProfile } = useProfileSheet();

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
    socket.on("friend-requests:changed", onFriendRequestsChanged);
    return () => socket.off("friend-requests:changed", onFriendRequestsChanged);
  }, [user]);

  useEffect(() => {
    const person = location.state?.selectedFriend;
    if (person) setSelectedFriend(person);
  }, [location.state]);

  useEffect(() => {
    setSelectedMessageIds([]);
    setDeleteSheetOpen(false);
  }, [selectedFriend?._id]);

  useEffect(() => {
    document.body.classList.toggle("chat-thread-open", Boolean(selectedFriend));
    return () => document.body.classList.remove("chat-thread-open");
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
    connectSocket().emit("friend-request:respond", { requestId, action }, (result) => {
      if (!result?.ok) return toast.error(result?.message || "Could not update request.");
      toast.success(`Friend request ${action}ed.`);
      loadContacts();
    });
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim() || !selectedFriend) return;
    connectSocket().emit("message:send", { receiverId: selectedFriend._id, text }, (result) => {
      if (!result?.ok) toast.error(result?.message || "Could not send message.");
    });
    setText("");
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

  if (!user) return <div className="container mt-5">Please log in to view chats.</div>;

  const threadOpen = Boolean(selectedFriend);

  return (
    <main className={`chat-page${threadOpen ? " chat-page--thread-open" : ""}`}>
      <MediaLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        src={lightbox?.src}
        alt={lightbox?.alt}
        downloadHref={lightbox?.href}
        downloadName={lightbox?.name}
        mode={lightbox?.mode || "image"}
      />

      {attachSheetOpen && (
        <div
          className="chat-message-sheet chat-attach-sheet"
          role="presentation"
          onClick={() => !uploading && setAttachSheetOpen(false)}
        >
          <div
            className="chat-message-sheet__panel chat-attach-sheet__panel"
            role="dialog"
            aria-label="Send attachment"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="chat-message-sheet__hint">Send attachment</p>
            <div className="chat-attach-sheet__options">
              <button
                type="button"
                className="chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(imageInputRef)}
              >
                <span className="chat-attach-sheet__icon" aria-hidden="true">
                  <FiImage />
                </span>
                Photos
              </button>
              <button
                type="button"
                className="chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(videoInputRef)}
              >
                <span className="chat-attach-sheet__icon chat-attach-sheet__icon--video" aria-hidden="true">
                  <FiVideo />
                </span>
                Videos
              </button>
              <button
                type="button"
                className="chat-attach-sheet__option"
                disabled={uploading}
                onClick={() => openAttachPicker(documentInputRef)}
              >
                <span className="chat-attach-sheet__icon chat-attach-sheet__icon--doc" aria-hidden="true">
                  <FiFileText />
                </span>
                Document
              </button>
            </div>
            <button
              type="button"
              className="chat-message-sheet__action chat-message-sheet__action--cancel"
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
          className="chat-message-sheet"
          role="presentation"
          onClick={() => !deletingMessage && setDeleteSheetOpen(false)}
        >
          <div
            className="chat-message-sheet__panel"
            role="dialog"
            aria-label="Delete messages"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="chat-message-sheet__hint">
              Delete {selectedMessageIds.length} message{selectedMessageIds.length === 1 ? "" : "s"}?
            </p>
            {canDeleteForEveryone && (
              <button
                type="button"
                className="chat-message-sheet__action chat-message-sheet__action--danger"
                disabled={deletingMessage}
                onClick={() => deleteSelectedMessages("everyone")}
              >
                Delete for everyone
              </button>
            )}
            <button
              type="button"
              className="chat-message-sheet__action chat-message-sheet__action--danger"
              disabled={deletingMessage}
              onClick={() => deleteSelectedMessages("me")}
            >
              Delete for me
            </button>
            <button
              type="button"
              className="chat-message-sheet__action chat-message-sheet__action--cancel"
              disabled={deletingMessage}
              onClick={() => setDeleteSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className={`chat-layout${threadOpen ? " chat-layout--thread-open" : ""}`}>
        <aside className="chat-sidebar" aria-label="Chat contacts">
          <h2>Chats</h2>
          {requests.length > 0 && (
            <>
              <h3>Requests</h3>
              {requests.map((request) => (
                <div className="chat-request" key={request._id}>
                  <UsernameLink person={request.from} />
                  <button type="button" onClick={() => respondToRequest(request._id, "accept")}>Accept</button>
                  <button type="button" onClick={() => respondToRequest(request._id, "reject")}>Reject</button>
                </div>
              ))}
            </>
          )}
          <h3>Friends</h3>
          {friends.length ? friends.map((friend) => (
            <button
              type="button"
              className={`chat-contact ${selectedFriend?._id === friend._id ? "chat-contact--active" : ""}`}
              onClick={() => setSelectedFriend(friend)}
              key={friend._id}
            >
              <img src={userAvatarUrl(friend)} alt="" />
              <span>
                <UsernameLink person={friend} />
                <small>{friend.name}</small>
              </span>
            </button>
          )) : <p>No accepted friends yet.</p>}
        </aside>

        <section className="chat-panel" aria-label="Chat conversation">
          {selectedFriend ? (
            <>
              <header className={`chat-thread-header${selectionActive ? " chat-thread-header--select" : ""}`}>
                <button
                  type="button"
                  className="chat-back"
                  onClick={onHeaderBack}
                  aria-label={selectionActive ? "Cancel selection" : "Back to chats"}
                >
                  {selectionActive ? <FiX size={22} /> : <FiArrowLeft size={22} />}
                </button>
                {!selectionActive && (
                  <button
                    type="button"
                    className="chat-thread-header__avatar-btn"
                    onClick={() => openProfile(selectedFriend)}
                    aria-label={`View ${selectedFriend.userName}'s profile`}
                  >
                    <img
                      className="chat-thread-header__avatar"
                      src={userAvatarUrl(selectedFriend)}
                      alt=""
                    />
                  </button>
                )}
                <div className="chat-thread-header__meta">
                  {selectionActive ? (
                    <>
                      <strong>{selectedMessageIds.length} selected</strong>
                      <span>Tap messages to select more</span>
                    </>
                  ) : (
                    <>
                      <strong>
                        <UsernameLink person={selectedFriend} className="username-link--header" />
                      </strong>
                      <span>{selectedFriend.name}</span>
                    </>
                  )}
                </div>
                {selectionActive && (
                  <button
                    type="button"
                    className="chat-thread-header__delete"
                    onClick={() => setDeleteSheetOpen(true)}
                    disabled={deletingMessage}
                    aria-label="Delete selected messages"
                  >
                    <FiTrash2 size={20} />
                  </button>
                )}
              </header>
              <div className="chat-messages">
                {messages.map((message) => (
                  <ChatMessage
                    key={message._id}
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
                ))}
              </div>
              <form className={`chat-composer${selectionActive ? " chat-composer--hidden" : ""}`} onSubmit={sendMessage}>
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
                  className="chat-composer__attach"
                  onClick={() => setAttachSheetOpen(true)}
                  disabled={uploading}
                  aria-label="Attach photos, videos, or documents"
                  aria-expanded={attachSheetOpen}
                >
                  <FiPaperclip />
                </button>
                <input
                  className="chat-composer__input"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={uploading ? "Uploading..." : "Write a message..."}
                  maxLength="2000"
                  disabled={uploading}
                />
                <button className="chat-composer__send" type="submit" disabled={uploading} aria-label="Send message">
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty chat-empty--desktop">Choose an accepted friend to start chatting.</div>
          )}
        </section>
      </section>
    </main>
  );
};

export default Chat;
