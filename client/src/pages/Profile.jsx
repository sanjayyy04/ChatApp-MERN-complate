import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";

const Profile = () => {
  const { user, authLoading, logout } = useContext(UserContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (authLoading) {
    return <div className="container mt-5">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="container mt-5">Please login to view your profile.</div>
    );
  }

  const avatarUrl = `https://i.pravatar.cc/320?u=${encodeURIComponent(
    user._id || user.id || user.userName,
  )}`;

  return (
    <div className="profile-page">
      <section className="profile-panel" aria-label="Your profile">
        <div className="profile-cover" role="img" aria-label="Profile cover" />

        <div className="profile-panel__body">
          <img
            className="profile-panel__avatar"
            src={avatarUrl}
            alt={`${user.userName} profile`}
          />

          <div className="profile-identity">
            <div>
              <h1>{user.name}</h1>
              <p className="profile-panel__username">@{user.userName}</p>
            </div>
            <button type="button" className="profile-follow-button">
              Follow
            </button>
          </div>

          <p className="profile-bio">
            Building connections and sharing moments with the people in this
            community.
          </p>

          <div className="profile-details">
            <div className="profile-detail">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="profile-detail">
              <span>Phone</span>
              <strong>{user.phone || "Not available"}</strong>
            </div>
            <div className="profile-detail">
              <span>Phone</span>
              <strong>{user.phone || "Not available"}</strong>
            </div>
          </div>

          <div className="profile-stats" aria-label="Profile activity">
            <div>
              <strong>0</strong>
              <span>Following</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Followers</span>
            </div>
          </div>

          <button
            type="button"
            className="profile-panel__logout"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </section>
    </div>
  );
};

export default Profile;
