import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { API_URL } from "../api";
import { useProfileSheet } from "../context/ProfileSheetContext";
import { useUserSearch } from "../hooks/useUserSearch";
import UserSearchResults, { UserSearchField } from "../components/UserSearchResults";

const Users = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { openProfile, friendIds, pendingRequestIds, refreshSocialState } = useProfileSheet();
  const { results, loading, error, minLength } = useUserSearch(query);

  const sendFriendRequestTo = async (userId, event) => {
    event?.stopPropagation();
    try {
      await axios.post(`${API_URL}/api/friend-requests/${userId}`, {}, { withCredentials: true });
      toast.success("Friend request sent.");
      await refreshSocialState();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send request.");
    }
  };

  const cancelFriendRequestTo = async (userId, event) => {
    event?.stopPropagation();
    try {
      await axios.delete(`${API_URL}/api/friend-requests/${userId}`, { withCredentials: true });
      toast.success("Request cancelled.");
      await refreshSocialState();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel request.");
    }
  };

  const openChat = (person) => {
    navigate("/chats", { state: { selectedFriend: person } });
  };

  return (
    <div className="crud-chat-pane-layout">
      <div className="crud-chat-pane-layout__list crud-chat-tab-scroll crud-chat-users-page">
        <header className="crud-chat-pane-header">
          <h2 className="crud-chat-pane-header__title">Search</h2>
        </header>
        <div className="crud-chat-search-container crud-chat-user-search">
          <UserSearchField
            id="username"
            value={query}
            onChange={setQuery}
            autoFocus
            className="crud-chat-search-form__input-wrap"
          />
          <p className="crud-chat-user-search__privacy-hint">
            Search matches @username only. Email and phone are never shown in results.
          </p>
          <UserSearchResults
            results={results}
            loading={loading}
            error={error}
            query={query}
            minLength={minLength}
            friendIds={friendIds}
            pendingRequestIds={pendingRequestIds}
            onOpenProfile={openProfile}
            onOpenChat={openChat}
            onSendRequest={sendFriendRequestTo}
            onCancelRequest={cancelFriendRequestTo}
          />
        </div>
      </div>
      <aside className="crud-chat-pane-layout__detail" aria-label="Search help">
        <div className="crud-chat-pane-empty">
          <p>Find people as you type — results update in real time.</p>
          <p className="crud-chat-pane-empty__hint">
            Only public profile info is visible until you become friends. Tap a user to view their profile.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default Users;
