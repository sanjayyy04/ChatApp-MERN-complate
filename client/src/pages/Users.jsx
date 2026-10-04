import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { useProfileSheet } from "../context/ProfileSheetContext";
import { API_URL, userAvatarUrl } from "../api";
import { CiSearch } from "react-icons/ci";
import { IoCloseOutline } from "react-icons/io5";
import { toast } from "react-toastify";
import UsernameLink from "../components/UsernameLink";

const Users = () => {
  const { users, setUsers } = useContext(UserContext);
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const { openProfile, friendIds, pendingRequestIds, refreshSocialState } = useProfileSheet();

  async function getUsers() {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        withCredentials: true,
      });
      setUsers(response.data.data);
    } catch (error) {
      console.log("There was an error while fetching the users", error);
    }
  }

  useEffect(() => {
    getUsers();
  }, []);

  const handleInputChange = (e) => {
    setUsername(e.target.value);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setSearchResults([]);
      setSearchError("Enter a username to search.");
      return;
    }

    try {
      setSearchError("");
      const response = await axios.get(
        `${API_URL}/api/users/search?username=${encodeURIComponent(username)}`,
        { withCredentials: true },
      );
      setSearchResults(response.data.data);
    } catch (error) {
      setSearchResults([]);
      setSearchError(error.response?.data?.message || "User search failed.");
    }
  };

  const closeSearch = () => {
    setSearchResults([]);
    setSearchError("");
    setUsername("");
  };

  const sendFriendRequest = async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/api/friend-requests/${userId}`, {}, { withCredentials: true });
      toast.success(response.data.message);
      await refreshSocialState();
    } catch (error) {
      if (error.response?.status === 409) {
        await refreshSocialState();
      }
      toast.error(error.response?.data?.message || "Could not send request.");
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/friend-requests/${userId}`, {
        withCredentials: true,
      });
      toast.success(response.data.message || "Friend request canceled.");
      await refreshSocialState();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel request.");
    }
  };

  const handleFriendAction = (userId, event) => {
    event.stopPropagation();
    const id = String(userId);
    if (friendIds.has(id)) return;
    if (pendingRequestIds.has(id)) {
      cancelFriendRequest(userId);
      return;
    }
    sendFriendRequest(userId);
  };

  const friendActionLabel = (userId) => {
    const id = String(userId);
    if (friendIds.has(id)) return "Friends";
    if (pendingRequestIds.has(id)) return "Requested";
    return "Send friend request";
  };

  const isFriendActionDisabled = (userId) => friendIds.has(String(userId));

  return (
    <div className="page-shell">
      {/* <PageHero
        eyebrow="Your community"
        title="People in the app"
        description="Browse the people who are making this space feel alive."
        current="Users"
      /> */}

      <div className="users-page container">
        <h2 className="users-page__title">Explore Users</h2>

        <div className="search-container">
          <form className="search-form" onSubmit={handleFormSubmit}>
            <label className="search-form__label" htmlFor="username">
              Search for another user by username
            </label>
            <div className="search-form__row">
              <input
                id="username"
                className="search-form__input"
                type="search"
                placeholder="Enter username"
                name="username"
                value={username}
                onChange={handleInputChange}
                autoComplete="off"
              />
              <button type="submit" className="search-form__submit" aria-label="Search users">
                <CiSearch size={22} aria-hidden="true" />
                <span className="search-form__submit-text">Search</span>
              </button>
            </div>
          </form>

          {searchError && <p className="search-form__error text-danger">{searchError}</p>}

          {searchResults.length > 0 && (
            <section className="search-results" aria-label="Search results">
              <div className="search-results__header">
                <h3>Search results</h3>
                <button type="button" className="search-results__close" onClick={closeSearch} aria-label="Close search results">
                  <IoCloseOutline size={22} />
                </button>
              </div>
              {searchResults.map((foundUser) => (
                <div
                  key={foundUser._id}
                  className="user-card user-card--result user-card--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProfile(foundUser)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProfile(foundUser);
                    }
                  }}
                >
                  <img
                    className="user-card__avatar"
                    src={userAvatarUrl(foundUser)}
                    alt={`${foundUser.userName} profile`}
                  />
                  <div className="user-card__identity">
                    <strong><UsernameLink person={foundUser} className="username-link--strong" /></strong>
                    <span>{foundUser.name}</span>
                  </div>
                  <button
                    type="button"
                    className={`user-card__action btn btn-sm ${
                      pendingRequestIds.has(String(foundUser._id))
                        ? "user-card__action--requested"
                        : isFriendActionDisabled(foundUser._id)
                          ? "user-card__action--requested"
                          : "btn-primary"
                    }`}
                    disabled={isFriendActionDisabled(foundUser._id)}
                    title={pendingRequestIds.has(String(foundUser._id)) ? "Tap to cancel request" : undefined}
                    onClick={(event) => handleFriendAction(foundUser._id, event)}
                  >
                    {friendActionLabel(foundUser._id)}
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="users-grid" aria-label="Registered users">
          {users.map((listUser) => (
            <article
              className="user-card user-card--clickable"
              key={listUser._id}
              role="button"
              tabIndex={0}
              onClick={() => openProfile(listUser)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openProfile(listUser);
                }
              }}
            >
              <img
                className="user-card__avatar"
                src={userAvatarUrl(listUser)}
                alt={`${listUser.userName} profile`}
              />
              <div className="user-card__identity">
                <strong title={`@${listUser.userName}`}>
                  <UsernameLink person={listUser} className="username-link--strong" />
                </strong>
                <span>{listUser.name}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Users;
