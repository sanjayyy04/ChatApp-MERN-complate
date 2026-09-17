import React, { useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { API_URL } from "../api";
import PageHero from "../components/PageHero";
import { CiSearch } from "react-icons/ci";
import { useState } from "react";
import { IoCloseOutline } from "react-icons/io5";

const Users = () => {
  const { users, setUsers } = useContext(UserContext);
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");

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

  const getAvatarUrl = (id) =>
    `https://i.pravatar.cc/160?u=${encodeURIComponent(id)}`;

  return (
    <div className="page-shell">
      {/* <PageHero
        eyebrow="Your community"
        title="People in the app"
        description="Browse the people who are making this space feel alive."
        current="Users"
      /> */}

      <div className="container mt-5">
        <h2 className="mb-4">Explore Users</h2>

        <div className="search-container">
          <form className="search-form" onSubmit={handleFormSubmit}>
            <p>Search for another user by username.</p>
            <div className="input-group">
              <label>Username |</label>
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                name="username"
                value={username}
                onChange={handleInputChange}
              />
              <button type="submit">
                <CiSearch size={30} />
              </button>
            </div>
          </form>

          {searchError && <p className="text-danger mt-3">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3>
                Search results{" "}
                <button className="close-btn" onClick={closeSearch}>
                  <IoCloseOutline size={30} />
                </button>
              </h3>
              {searchResults.map((foundUser) => (
                <div
                  key={foundUser._id}
                  className="user-card user-card--result"
                >
                  <img
                    className="user-card__avatar"
                    src={getAvatarUrl(foundUser._id)}
                    alt={`${foundUser.userName} profile`}
                  />
                  <div className="user-card__identity">
                    <strong>{foundUser.userName}</strong>
                    <span>{foundUser.name}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm ms-3"
                    disabled
                  >
                    Send friend request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="users-grid" aria-label="Registered users">
          {users.map((user) => (
            <article className="user-card" key={user._id}>
              <img
                className="user-card__avatar"
                src={getAvatarUrl(user._id)}
                alt={`${user.userName} profile`}
              />
              <div className="user-card__identity">
                <strong title={`@${user.userName}`}>@{user.userName}</strong>
                <span>{user.name}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Users;
