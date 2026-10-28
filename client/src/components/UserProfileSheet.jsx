import React, { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiMessageCircle, FiUserPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { API_URL, userAvatarUrl } from "../api";
import { connectSocket } from "../services/socket";
import MediaLightbox from "./MediaLightbox";
import { RealtimeContext } from "../context/RealtimeContext";
import PresenceStatus from "./PresenceStatus";

const UserProfileSheet = ({
  open,
  userPreview,
  friendIds,
  pendingRequestIds,
  onClose,
  onFriendRequestSent,
  onFriendRequestCanceled,
}) => {
  const navigate = useNavigate();
  const realtime = useContext(RealtimeContext);
  const isUserOnline = (userId) => realtime?.isUserOnline?.(userId) ?? false;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 });

  const loadSocialStats = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_URL}/api/social/stats/${userId}`, {
        withCredentials: true,
      });
      setSocialStats(response.data.data);
    } catch {
      setSocialStats({ followers: 0, following: 0 });
    }
  }, []);

  useEffect(() => {
    if (!open || !userPreview?._id) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    axios
      .get(`${API_URL}/api/users/${userPreview._id}`, { withCredentials: true })
      .then((response) => {
        if (!cancelled) setProfile(response.data.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load profile.");
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userPreview?._id]);

  useEffect(() => {
    if (!open || !userPreview?._id) {
      setSocialStats({ followers: 0, following: 0 });
      return undefined;
    }

    const userId = String(userPreview._id);
    loadSocialStats(userId);

    const socket = connectSocket();
    const onSocialUpdated = (payload) => {
      const affectedIds = payload?.userIds?.map(String) || [];
      if (!affectedIds.length || affectedIds.includes(userId)) {
        loadSocialStats(userId);
      }
    };

    socket.on("social:updated", onSocialUpdated);
    return () => socket.off("social:updated", onSocialUpdated);
  }, [open, userPreview?._id, loadSocialStats]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !userPreview) return null;

  const person = profile || userPreview;
  const avatarSrc = userAvatarUrl(person);
  const isFriend = friendIds.has(String(person._id));
  const isPending = pendingRequestIds?.has(String(person._id));

  const cancelFriendRequest = async () => {
    setRequesting(true);
    try {
      const response = await axios.delete(`${API_URL}/api/friend-requests/${person._id}`, {
        withCredentials: true,
      });
      toast.success(response.data.message || "Friend request canceled.");
      onFriendRequestCanceled?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel request.");
    } finally {
      setRequesting(false);
    }
  };

  const sendFriendRequest = async () => {
    setRequesting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/friend-requests/${person._id}`,
        {},
        { withCredentials: true },
      );
      toast.success(response.data.message);
      onFriendRequestSent?.(person._id);
    } catch (error) {
      if (error.response?.status === 409) {
        onFriendRequestSent?.(person._id);
      }
      toast.error(error.response?.data?.message || "Could not send request.");
    } finally {
      setRequesting(false);
    }
  };

  const openChat = () => {
    onClose();
    navigate("/chats", { state: { selectedFriend: person } });
  };

  return (
    <div className="crud-chat-user-sheet" role="dialog" aria-modal="true" aria-label={`${person.userName} profile`}>
      <MediaLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        src={lightbox?.src}
        alt={lightbox?.alt}
        mode="image"
      />

      <header className="crud-chat-user-sheet__topbar">
        <button type="button" className="crud-chat-user-sheet__back" onClick={onClose} aria-label="Close profile">
          <FiArrowLeft size={22} />
        </button>
        <span className="crud-chat-user-sheet__handle">@{person.userName}</span>
      </header>

      <div className="crud-chat-user-sheet__scroll">
        {loading && !profile ? (
          <p className="crud-chat-user-sheet__loading">Loading profile…</p>
        ) : (
          <article className="crud-chat-user-sheet__card crud-chat-profile-panel crud-chat-profile-panel--ig">
            <div className="crud-chat-profile-panel__body crud-chat-profile-panel__body--ig crud-chat-user-sheet__body">
              <div className="crud-chat-profile-ig-hero">
                <button
                  type="button"
                  className="crud-chat-profile-panel__avatar-btn"
                  onClick={() => setLightbox({ src: avatarSrc, alt: `${person.userName} profile` })}
                  aria-label="View profile photo"
                >
                  <img className="crud-chat-profile-panel__avatar crud-chat-profile-panel__avatar--ig" src={avatarSrc} alt="" />
                </button>

                <div className="crud-chat-profile-ig-stats" aria-label="Profile stats">
                  <div className="crud-chat-profile-ig-stat crud-chat-profile-ig-stat--static">
                    <strong>0</strong>
                    <span>posts</span>
                  </div>
                  <div className="crud-chat-profile-ig-stat crud-chat-profile-ig-stat--static">
                    <strong>{socialStats.followers}</strong>
                    <span>followers</span>
                  </div>
                  <div className="crud-chat-profile-ig-stat crud-chat-profile-ig-stat--static">
                    <strong>{socialStats.following}</strong>
                    <span>following</span>
                  </div>
                </div>
              </div>

              <div className="crud-chat-profile-ig-actions crud-chat-user-sheet__actions">
                {isFriend ? (
                  <button type="button" className="crud-chat-profile-ig-btn crud-chat-profile-ig-btn--primary" onClick={openChat}>
                    <FiMessageCircle aria-hidden="true" />
                    Message
                  </button>
                ) : isPending ? (
                  <button
                    type="button"
                    className="crud-chat-profile-ig-btn crud-chat-profile-ig-btn--requested"
                    onClick={cancelFriendRequest}
                    disabled={requesting}
                    title="Tap to cancel request"
                  >
                    {requesting ? "Canceling…" : "Requested"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="crud-chat-profile-ig-btn crud-chat-profile-ig-btn--primary"
                    onClick={sendFriendRequest}
                    disabled={requesting}
                  >
                    <FiUserPlus aria-hidden="true" />
                    {requesting ? "Sending…" : "Follow"}
                  </button>
                )}
                {isFriend && (
                  <span className="crud-chat-user-sheet__badge">Friends</span>
                )}
              </div>

              <h1 className="crud-chat-profile-ig-name">{person.name}</h1>
              <PresenceStatus
                online={isUserOnline(person._id)}
                typing={false}
                className="crud-chat-user-sheet__presence"
              />
              <p className="crud-chat-profile-bio crud-chat-profile-bio--ig">
                {person.bio || "No bio yet."}
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default UserProfileSheet;
