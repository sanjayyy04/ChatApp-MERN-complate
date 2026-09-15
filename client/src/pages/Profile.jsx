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

  return (
    <div className="container mt-5">
      <h1>Profile</h1>
      <p>Username: {user.userName}</p>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Phone: {user.phone}</p>
      <p>createdAt: {user.createdAt}</p>
      <p>updatedAt {user.updatedAt}</p>
      <button type="button" className="btn btn-danger" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Profile;
