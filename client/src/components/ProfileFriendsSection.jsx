import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiChevronRight, FiMessageCircle, FiSearch, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { API_URL, userAvatarUrl } from "../api";
import { connectSocket } from "../services/socket";
import { useProfileSheet } from "../context/ProfileSheetContext";
import { useRealtime } from "../context/RealtimeContext";
import PresenceStatus from "./PresenceStatus";

const TABS = [
  { id: "friends", label: "Friends", endpoint: "/api/friends" },
  { id: "followers", label: "Followers", endpoint: "/api/social/followers" },
  { id: "following", label: "Following", endpoint: "/api/social/following" },
];

const PREVIEW_LIMIT = 6;

const ProfileFriendsSection = () => {
  const navigate = useNavigate();
  const { openProfile } = useProfileSheet();
  const { isUserOnline } = useRealtime();
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");
  const [sheetList, setSheetList] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetQuery, setSheetQuery] = useState("");

  const loadStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/social/stats`, { withCredentials: true });
      setStats(response.data.data);
    } catch {
      setStats({ followers: 0, following: 0 });
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/friends`, { withCredentials: true });
      setFriends(response.data.data || []);
    } catch {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadFriends()]);
  }, [loadStats, loadFriends]);

  useEffect(() => {
    refreshAll().catch(() => {});
    const socket = connectSocket();
    const onSocial = () => {
      refreshAll().catch(() => {});
    };
    socket.on("social:updated", onSocial);
    return () => socket.off("social:updated", onSocial);
  }, [refreshAll]);

  const loadSheetTab = useCallback(async (tabId) => {
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab) return;
    setSheetLoading(true);
    try {
      const response = await axios.get(`${API_URL}${tab.endpoint}`, { withCredentials: true });
      setSheetList(response.data.data || []);
    } catch {
      setSheetList([]);
    } finally {
      setSheetLoading(false);
    }
  }, []);

  const openSheet = (tabId = "friends") => {
    setActiveTab(tabId);
    setSheetQuery("");
    setSheetOpen(true);
    loadSheetTab(tabId);
  };

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setSheetQuery("");
    loadSheetTab(tabId);
  };

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  const filteredSheetList = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase();
    if (!q) return sheetList;
    return sheetList.filter((person) => {
      const name = (person.name || "").toLowerCase();
      const userName = (person.userName || "").toLowerCase();
      return name.includes(q) || userName.includes(q);
    });
  }, [sheetList, sheetQuery]);

  const friendCount = friends.length;
  const previewFriends = friends.slice(0, PREVIEW_LIMIT);
  const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label || "Friends";

  const openChat = (person, event) => {
    event?.stopPropagation();
    setSheetOpen(false);
    navigate("/chats", { state: { selectedFriend: person } });
  };

  return (
    <>
      <p className="crud-chat-profile-section-label">Friends</p>
      <section className="crud-chat-profile-section crud-chat-profile-friends">
        <div className="crud-chat-profile-friends__stats">
          <button type="button" className="crud-chat-profile-friends__stat" onClick={() => openSheet("friends")}>
            <strong>{friendCount}</strong>
            <span>Friends</span>
          </button>
          <span className="crud-chat-profile-friends__stat-divider" aria-hidden="true" />
          <button type="button" className="crud-chat-profile-friends__stat" onClick={() => openSheet("followers")}>
            <strong>{stats.followers}</strong>
            <span>Followers</span>
          </button>
          <span className="crud-chat-profile-friends__stat-divider" aria-hidden="true" />
          <button type="button" className="crud-chat-profile-friends__stat" onClick={() => openSheet("following")}>
            <strong>{stats.following}</strong>
            <span>Following</span>
          </button>
        </div>

        {friendsLoading ? (
          <p className="crud-chat-profile-friends__hint">Loading friends…</p>
        ) : friendCount === 0 ? (
          <p className="crud-chat-profile-friends__hint">
            No friends yet. Use Search to send friend requests and start chatting.
          </p>
        ) : (
          <>
            <ul className="crud-chat-profile-friends__preview" aria-label="Friends preview">
              {previewFriends.map((person) => (
                <li key={person._id}>
                  <div className="crud-chat-profile-friend">
                    <button
                      type="button"
                      className="crud-chat-profile-friend__main"
                      onClick={() => openProfile(person)}
                    >
                      <span className="crud-chat-profile-friend__avatar">
                        <img src={userAvatarUrl(person)} alt="" />
                        {isUserOnline(person._id) ? (
                          <span className="crud-chat-profile-friend__online" aria-label="Online" />
                        ) : null}
                      </span>
                      <span className="crud-chat-profile-friend__meta">
                        <strong>{person.name || person.userName}</strong>
                        <span>@{person.userName}</span>
                        <PresenceStatus online={isUserOnline(person._id)} className="crud-chat-profile-friend__presence" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="crud-chat-profile-friend__chat"
                      aria-label={`Message ${person.userName}`}
                      onClick={(event) => openChat(person, event)}
                    >
                      <FiMessageCircle />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {friendCount > PREVIEW_LIMIT ? (
              <button
                type="button"
                className="crud-chat-profile-friends__see-all"
                onClick={() => openSheet("friends")}
              >
                See all {friendCount} friends
                <FiChevronRight aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="crud-chat-profile-friends__see-all" onClick={() => openSheet("friends")}>
                Manage friends
                <FiChevronRight aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </section>

      {sheetOpen ? (
        <div className="crud-chat-friends-sheet" role="presentation" onMouseDown={() => setSheetOpen(false)}>
          <div
            className="crud-chat-friends-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-chat-friends-sheet-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="crud-chat-friends-sheet__header">
              <button
                type="button"
                className="crud-chat-friends-sheet__close"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
              >
                <FiX size={22} />
              </button>
              <h2 id="crud-chat-friends-sheet-title">{activeTabLabel}</h2>
            </header>

            <div className="crud-chat-friends-sheet__tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`crud-chat-friends-sheet__tab${activeTab === tab.id ? " crud-chat-friends-sheet__tab--active" : ""}`}
                  onClick={() => switchTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className="crud-chat-friends-sheet__search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={sheetQuery}
                onChange={(event) => setSheetQuery(event.target.value)}
                placeholder="Search name or username"
                autoComplete="off"
              />
            </label>

            <div className="crud-chat-friends-sheet__body">
              {sheetLoading ? (
                <p className="crud-chat-profile-friends__hint">Loading…</p>
              ) : filteredSheetList.length === 0 ? (
                <p className="crud-chat-profile-friends__hint">
                  {sheetQuery.trim()
                    ? "No matches."
                    : `No ${activeTabLabel.toLowerCase()} yet.`}
                </p>
              ) : (
                <ul className="crud-chat-profile-friends__list">
                  {filteredSheetList.map((person) => (
                    <li key={person._id}>
                      <div className="crud-chat-profile-friend">
                        <button
                          type="button"
                          className="crud-chat-profile-friend__main"
                          onClick={() => openProfile(person)}
                        >
                          <span className="crud-chat-profile-friend__avatar">
                            <img src={userAvatarUrl(person)} alt="" />
                            {isUserOnline(person._id) ? (
                              <span className="crud-chat-profile-friend__online" aria-label="Online" />
                            ) : null}
                          </span>
                          <span className="crud-chat-profile-friend__meta">
                            <strong>{person.name || person.userName}</strong>
                            <span>@{person.userName}</span>
                            <PresenceStatus
                              online={isUserOnline(person._id)}
                              className="crud-chat-profile-friend__presence"
                            />
                          </span>
                        </button>
                        <button
                          type="button"
                          className="crud-chat-profile-friend__chat"
                          aria-label={`Message ${person.userName}`}
                          onClick={(event) => openChat(person, event)}
                        >
                          <FiMessageCircle />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ProfileFriendsSection;
