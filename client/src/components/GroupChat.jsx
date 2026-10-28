import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiSend,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { API_URL } from "../api";
import { connectSocket, emitSocket } from "../services/socket";
import { buildMessageTimeline, formatMessageTime } from "../utils/chatDates";
import { useProfileSheet } from "../context/ProfileSheetContext";
import CreateGroupModal from "./CreateGroupModal";
import GroupSettingsModal from "./GroupSettingsModal";
import GroupInviteModal from "./GroupInviteModal";
import UsernameLink from "./UsernameLink";

/** Resolve sender for group bubbles (populated sender or member list fallback). */
const resolveGroupMessageSender = (message, currentUser, groupMembers = []) => {
  const senderId = String(message.sender?._id || message.sender);
  const isSent = senderId === String(currentUser?._id);
  if (isSent) {
    return { isSent, person: currentUser, label: "You" };
  }
  let person =
    message.sender && typeof message.sender === "object" && message.sender.userName
      ? message.sender
      : null;
  if (!person && groupMembers.length) {
    person = groupMembers.find((member) => String(member._id) === senderId) || null;
  }
  return {
    isSent,
    person,
    label: person?.userName || "Member",
  };
};

const GroupChat = () => {
  const { user } = useContext(UserContext);
  const { openProfile } = useProfileSheet();
  const location = useLocation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createIsPrivate, setCreateIsPrivate] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState("");
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberResults, setAddMemberResults] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [discoverable, setDiscoverable] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const [inviteState, setInviteState] = useState(null);
  const [inviteJoining, setInviteJoining] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const messagesEndRef = useRef(null);

  const clearInviteQuery = useCallback(() => {
    navigate("/groups", { replace: true });
  }, [navigate]);

  const loadGroups = useCallback(async () => {
    const response = await axios.get(`${API_URL}/api/groups`, { withCredentials: true });
    const list = response.data.data || [];
    setGroups(list);
    const ids = list.map((g) => String(g._id));
    if (ids.length) {
      emitSocket("group:subscribe", ids);
    }
    return list;
  }, []);

  const openCreateModal = () => {
    setCreateError("");
    setCreateName("");
    setCreateIsPrivate(true);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creatingGroup) return;
    setCreateOpen(false);
    setCreateError("");
  };

  useEffect(() => {
    if (!user) return;
    loadGroups().catch(() => toast.error("Could not load groups."));
    axios
      .get(`${API_URL}/api/groups/discover`, { withCredentials: true })
      .then((response) => setDiscoverable(response.data.data || []))
      .catch(() => setDiscoverable([]));
  }, [user, loadGroups]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const invite = params.get("invite");
    if (!invite || !user) {
      if (!invite) setInviteState(null);
      return undefined;
    }

    let cancelled = false;
    setInviteError("");

    (async () => {
      try {
        const previewRes = await axios.get(
          `${API_URL}/api/groups/invite/${encodeURIComponent(invite)}/preview`,
        );
        const list = await loadGroups();
        if (cancelled) return;
        const preview = previewRes.data.data;
        const existing = (list || []).find((g) => String(g._id) === String(preview.groupId));
        if (existing) {
          setSelectedGroup(existing);
          toast.info("You're already in this group.");
          clearInviteQuery();
          return;
        }
        setInviteState({ code: invite, preview });
      } catch (error) {
        if (cancelled) return;
        toast.error(error.response?.data?.message || "Invalid invite link.");
        clearInviteQuery();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, location.search, loadGroups, clearInviteQuery]);

  const confirmInviteJoin = async () => {
    if (!inviteState?.code) return;
    setInviteJoining(true);
    setInviteError("");
    try {
      const response = await axios.post(
        `${API_URL}/api/groups/join/invite`,
        { code: inviteState.code },
        { withCredentials: true },
      );
      setSelectedGroup(response.data.data);
      await loadGroups();
      toast.success(response.data.message || "Joined group.");
      setInviteState(null);
      clearInviteQuery();
    } catch (error) {
      setInviteError(error.response?.data?.message || "Could not join with invite.");
    } finally {
      setInviteJoining(false);
    }
  };

  const dismissInvite = () => {
    setInviteState(null);
    setInviteError("");
    clearInviteQuery();
  };

  useEffect(() => {
    if (location.state?.resetGroup) {
      setSelectedGroup(null);
      navigate("/groups", { replace: true, state: null });
    }
    const groupId = location.state?.groupId;
    if (groupId && groups.length) {
      const match = groups.find((g) => String(g._id) === String(groupId));
      if (match) setSelectedGroup(match);
      navigate("/groups", { replace: true, state: null });
    }
  }, [location.state, groups, navigate]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => {
      document.body.classList.toggle("crud-chat-thread-open", mq.matches && Boolean(selectedGroup));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.body.classList.remove("crud-chat-thread-open");
    };
  }, [selectedGroup]);

  useEffect(() => {
    if (!user) return undefined;
    const socket = connectSocket();
    const onGroupMessage = (message) => {
      if (!selectedGroup || String(message.group) !== String(selectedGroup._id)) return;
      setMessages((current) => (
        current.some((item) => String(item._id) === String(message._id)) ? current : [...current, message]
      ));
    };
    const onGroupUpdated = () => {
      loadGroups().then((list) => {
        if (selectedGroup) {
          const updated = list.find((g) => String(g._id) === String(selectedGroup._id));
          if (updated) setSelectedGroup(updated);
        }
      }).catch(() => {});
    };
    const onGroupDeleted = ({ groupId }) => {
      setGroups((current) => current.filter((g) => String(g._id) !== String(groupId)));
      if (selectedGroup && String(selectedGroup._id) === String(groupId)) {
        setSelectedGroup(null);
        setMessages([]);
      }
    };
    socket.on("group:message:new", onGroupMessage);
    socket.on("group:updated", onGroupUpdated);
    socket.on("group:deleted", onGroupDeleted);
    return () => {
      socket.off("group:message:new", onGroupMessage);
      socket.off("group:updated", onGroupUpdated);
      socket.off("group:deleted", onGroupDeleted);
    };
  }, [user, selectedGroup, loadGroups]);

  useEffect(() => {
    if (!selectedGroup) {
      setMessages([]);
      return;
    }
    axios
      .get(`${API_URL}/api/groups/${selectedGroup._id}/messages`, { withCredentials: true })
      .then((response) => setMessages(response.data.data))
      .catch(() => toast.error("Could not load group messages."));
  }, [selectedGroup?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedGroup?._id]);

  useEffect(() => {
    if (!settingsOpen || !selectedGroup) return;
    axios
      .get(`${API_URL}/api/groups/${selectedGroup._id}`, { withCredentials: true })
      .then((response) => setSelectedGroup(response.data.data))
      .catch(() => {});
  }, [settingsOpen, selectedGroup?._id]);

  useEffect(() => {
    if (!settingsOpen || !selectedGroup || addMemberQuery.trim().length < 2) {
      setAddMemberResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      axios
        .get(`${API_URL}/api/groups/${selectedGroup._id}/member-search`, {
          params: { q: addMemberQuery.trim() },
          withCredentials: true,
        })
        .then((response) => setAddMemberResults(response.data.data))
        .catch(() => setAddMemberResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [addMemberQuery, settingsOpen, selectedGroup?._id]);

  const filteredGroups = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, listQuery]);

  const isAdmin = selectedGroup && String(selectedGroup.admin._id || selectedGroup.admin) === String(user?._id);
  const canSend = selectedGroup && (isAdmin || !selectedGroup.onlyAdminCanSend);
  const timeline = useMemo(() => buildMessageTimeline(messages), [messages]);
  const threadOpen = Boolean(selectedGroup);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim() || !selectedGroup || !canSend) return;
    emitSocket("group:message:send", { groupId: selectedGroup._id, text }, (result) => {
      if (!result?.ok) toast.error(result?.message || "Could not send message.");
      else if (result.data) {
        setMessages((current) => (
          current.some((item) => String(item._id) === String(result.data._id)) ? current : [...current, result.data]
        ));
      }
    });
    setText("");
  };

  const createGroup = async (event) => {
    event.preventDefault();
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError("Please enter a group name.");
      return;
    }
    setCreatingGroup(true);
    setCreateError("");
    try {
      const response = await axios.post(
        `${API_URL}/api/groups`,
        {
          name: trimmedName,
          isPrivate: createIsPrivate,
        },
        { withCredentials: true },
      );
      const created = response.data.data;
      setGroups((current) => [created, ...current.filter((g) => String(g._id) !== String(created._id))]);
      emitSocket("group:subscribe", [String(created._id)]);
      toast.success("Group created.");
      setCreateOpen(false);
      setCreateName("");
      setCreateIsPrivate(true);
      setSelectedGroup(created);
      loadGroups().catch(() => {});
    } catch (error) {
      let message = "Could not create group.";
      const status = error.response?.status;
      const data = error.response?.data;
      if (typeof data === "string" && data.trim()) {
        message = data.includes("Cannot POST") || data.includes("Cannot GET")
          ? "Group API is missing on the server. Stop and restart the backend (npm run start in the server folder), then try again."
          : data.slice(0, 180);
      } else if (data?.message) {
        message = data.message;
      } else if (status === 401) {
        message = "Session expired. Please log in again.";
      } else if (status === 404) {
        message = "Group API not found. Restart the backend server, then try again.";
      } else if (!error.response) {
        message = "Cannot reach server. Check that the API is running on port 3000.";
      }
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedGroup || !isAdmin) return;
    setSavingSettings(true);
    try {
      const response = await axios.patch(
        `${API_URL}/api/groups/${selectedGroup._id}`,
        {
          name: selectedGroup.name,
          isPrivate: selectedGroup.isPrivate !== false,
          requireJoinApproval: Boolean(selectedGroup.requireJoinApproval),
          onlyAdminCanSend: Boolean(selectedGroup.onlyAdminCanSend),
        },
        { withCredentials: true },
      );
      setSelectedGroup(response.data.data);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const addMember = async (memberId) => {
    if (!selectedGroup || !isAdmin) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/groups/${selectedGroup._id}/members`,
        { memberIds: [memberId] },
        { withCredentials: true },
      );
      setSelectedGroup(response.data.data);
      setAddMemberQuery("");
      setAddMemberResults([]);
      toast.success("Member added.");
      await loadGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add member.");
    }
  };

  const removeMember = async (memberId) => {
    if (!selectedGroup) return;
    try {
      await axios.delete(`${API_URL}/api/groups/${selectedGroup._id}/members/${memberId}`, {
        withCredentials: true,
      });
      toast.success("Member removed.");
      const list = await loadGroups();
      const updated = list.find((g) => String(g._id) === String(selectedGroup._id));
      if (updated) setSelectedGroup(updated);
      else {
        setSelectedGroup(null);
        setSettingsOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove member.");
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup || !isAdmin) return;
    if (!window.confirm(`Delete group "${selectedGroup.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/groups/${selectedGroup._id}`, { withCredentials: true });
      toast.success("Group deleted.");
      setSettingsOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete group.");
    }
  };

  const joinPublicGroup = async (groupId) => {
    setJoiningId(groupId);
    try {
      const response = await axios.post(`${API_URL}/api/groups/${groupId}/join`, {}, { withCredentials: true });
      if (response.status === 202) {
        toast.info(response.data.message || "Join request sent.");
      } else {
        toast.success(response.data.message || "Joined group.");
        setSelectedGroup(response.data.data);
        await loadGroups();
        setDiscoverable((current) => current.filter((g) => String(g._id) !== String(groupId)));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not join group.");
    } finally {
      setJoiningId(null);
    }
  };

  const regenerateInvite = async () => {
    if (!selectedGroup || !isAdmin) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/groups/${selectedGroup._id}/invite/regenerate`,
        {},
        { withCredentials: true },
      );
      setSelectedGroup(response.data.data);
      toast.success("Invite link updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update invite.");
    }
  };

  const respondJoinRequest = async (userId, action) => {
    if (!selectedGroup || !isAdmin) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/groups/${selectedGroup._id}/join-requests/${userId}`,
        { action },
        { withCredentials: true },
      );
      setSelectedGroup(response.data.data);
      toast.success(response.data.message);
      await loadGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update request.");
    }
  };

  const hasJoinedGroups = groups.length > 0;
  const showGroupList = filteredGroups.length > 0;

  if (!user) return null;

  return (
    <main className={`crud-chat-page${threadOpen ? " crud-chat-page--thread-open" : ""}`}>
      <section className={`crud-chat-layout${threadOpen ? " crud-chat-layout--thread-open" : ""}`}>
        <aside className="crud-chat-sidebar" aria-label="Groups">
          <header className="crud-chat-sidebar__toolbar">
            <h2 className="crud-chat-sidebar__title">Groups</h2>
            <div className="crud-chat-sidebar__toolbar-actions">
              {hasJoinedGroups ? (
                <button
                  type="button"
                  className="crud-chat-sidebar__menu-btn"
                  aria-label="New group"
                  title="New group"
                  onClick={openCreateModal}
                >
                  <FiPlus size={22} />
                </button>
              ) : null}
            </div>
          </header>
          {hasJoinedGroups ? (
            <label className="crud-chat-sidebar__search">
              <FiSearch aria-hidden="true" />
              <span className="crud-chat-visually-hidden">Search groups</span>
              <input
                type="search"
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Search groups"
                autoComplete="off"
              />
            </label>
          ) : null}
          <div className="crud-chat-sidebar__body">
          {showGroupList ? (
            <>
              {filteredGroups.map((group) => (
                <button
                  type="button"
                  key={group._id}
                  className={`crud-chat-contact${selectedGroup?._id === group._id ? " crud-chat-contact--active" : ""}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <span className="crud-chat-contact__group-icon" aria-hidden="true">
                    <FiUsers />
                  </span>
                  <span className="crud-chat-contact__meta">
                    <strong>{group.name}</strong>
                    <small>
                      {group.members.length} members · {group.isPrivate === false ? "Public" : "Private"}
                    </small>
                  </span>
                </button>
              ))}
              <button type="button" className="crud-chat-group-list__new-btn" onClick={openCreateModal}>
                <FiPlus aria-hidden="true" /> Create new group
              </button>
            </>
          ) : hasJoinedGroups && listQuery.trim() ? (
            <p className="crud-chat-sidebar__empty">No groups match your search.</p>
          ) : (
            <div className="crud-chat-group-list-empty">
              <FiUsers size={40} aria-hidden="true" />
              <p>You have not joined any groups yet.</p>
              <button type="button" className="crud-chat-group-list-empty__cta" onClick={openCreateModal}>
                Create new group
              </button>
            </div>
          )}
          {discoverable.length > 0 && !listQuery.trim() && (
            <section className="crud-chat-group-discover" aria-label="Public groups">
              <h3 className="crud-chat-sidebar__section-title">Join public groups</h3>
              {discoverable.map((group) => (
                <div key={group._id} className="crud-chat-contact crud-chat-contact--people">
                  <div className="crud-chat-contact__open">
                    <span className="crud-chat-contact__group-icon" aria-hidden="true"><FiUsers /></span>
                    <span className="crud-chat-contact__meta">
                      <strong>{group.name}</strong>
                      <small>
                        {group.members?.length || 0} members · by @{group.admin?.userName}
                      </small>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="crud-chat-contact__action"
                    disabled={joiningId === String(group._id)}
                    onClick={() => joinPublicGroup(group._id)}
                  >
                    {group.requireJoinApproval ? "Request" : "Join"}
                  </button>
                </div>
              ))}
            </section>
          )}
          </div>
        </aside>

        <section className="crud-chat-panel" aria-label="Group conversation">
          {selectedGroup ? (
            <>
              <header className="crud-chat-thread-header">
                <button
                  type="button"
                  className="crud-chat-back"
                  onClick={() => { setSelectedGroup(null); setSettingsOpen(false); }}
                  aria-label="Back to groups"
                >
                  <FiArrowLeft size={22} />
                </button>
                <div className="crud-chat-thread-header__meta">
                  <strong>{selectedGroup.name}</strong>
                  <span>
                    {selectedGroup.members.length} members · {selectedGroup.isPrivate === false ? "Public" : "Private"}
                  </span>
                </div>
                <button
                  type="button"
                  className="crud-chat-thread-header__delete"
                  aria-label="Group settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <FiSettings size={20} />
                </button>
              </header>

              <div className="crud-chat-messages">
                {timeline.map((item) => (
                  item.kind === "date" ? (
                    <div key={item.id} className="crud-chat-date-divider" role="separator">
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    (() => {
                      const message = item.message;
                      const isSent = String(message.sender._id || message.sender) === String(user._id);
                      const sender = resolveGroupMessageSender(
                        message,
                        user,
                        selectedGroup?.members || [],
                      );
                      return (
                        <div
                          key={message._id}
                          className={`crud-chat-message ${isSent ? "crud-chat-message--sent" : "crud-chat-message--received"} crud-chat-message--group`}
                        >
                          <span
                            className={`crud-chat-message__sender${sender.isSent ? " crud-chat-message__sender--self" : ""}`}
                          >
                            {sender.isSent ? (
                              sender.label
                            ) : sender.person ? (
                              <UsernameLink
                                person={sender.person}
                                showAt={false}
                                className="crud-chat-message__sender-link"
                              />
                            ) : (
                              sender.label
                            )}
                          </span>
                          <div className="crud-chat-message__content">
                            {message.text ? <p>{message.text}</p> : null}
                            <time className="crud-chat-message__time" dateTime={message.createdAt}>
                              {formatMessageTime(message.createdAt)}
                            </time>
                          </div>
                        </div>
                      );
                    })()
                  )
                ))}
                <div ref={messagesEndRef} className="crud-chat-messages__anchor" />
              </div>

              {canSend ? (
                <form className="crud-chat-composer" onSubmit={sendMessage}>
                  <input
                    className="crud-chat-composer__input"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type a group message"
                    maxLength={2000}
                  />
                  <button type="submit" className="crud-chat-composer__send" aria-label="Send">
                    <FiSend />
                  </button>
                </form>
              ) : (
                <p className="crud-chat-composer crud-chat-composer--readonly">
                  Only the group admin can send messages in this group.
                </p>
              )}
            </>
          ) : (
            <div className="crud-chat-empty crud-chat-empty--desktop">
              <FiUsers size={48} aria-hidden="true" />
              <p>{hasJoinedGroups ? "Select a group from the list." : "Create a group to start chatting."}</p>
            </div>
          )}
        </section>
      </section>

      {createOpen ? (
        <CreateGroupModal
          open={createOpen}
          name={createName}
          isPrivate={createIsPrivate}
          creating={creatingGroup}
          error={createError}
          onNameChange={setCreateName}
          onPrivateChange={setCreateIsPrivate}
          onSubmit={createGroup}
          onClose={closeCreateModal}
        />
      ) : null}

      {settingsOpen && selectedGroup ? (
        <GroupSettingsModal
          open={settingsOpen}
          group={selectedGroup}
          isAdmin={isAdmin}
          userId={user._id}
          saving={savingSettings}
          addMemberQuery={addMemberQuery}
          addMemberResults={addMemberResults}
          onClose={() => setSettingsOpen(false)}
          onGroupChange={setSelectedGroup}
          onSave={saveSettings}
          onAddMemberQuery={setAddMemberQuery}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onApproveRequest={(id) => respondJoinRequest(id, "approve")}
          onRejectRequest={(id) => respondJoinRequest(id, "reject")}
          onRegenerateInvite={regenerateInvite}
          onDeleteGroup={deleteGroup}
          onOpenProfile={openProfile}
        />
      ) : null}

      <GroupInviteModal
        open={Boolean(inviteState)}
        preview={inviteState?.preview}
        joining={inviteJoining}
        errorMessage={inviteError}
        onJoin={confirmInviteJoin}
        onDismiss={dismissInvite}
      />
    </main>
  );
};

export default GroupChat;
