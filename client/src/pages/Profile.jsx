import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { NavLink, useNavigate } from "react-router-dom";
import { API_URL, userAvatarUrl } from "../api";
import { connectSocket } from "../services/socket";
import { toast } from "react-toastify";
import { FiCamera, FiEdit2 } from "react-icons/fi";
import MediaLightbox from "../components/MediaLightbox";
import UsernameLink from "../components/UsernameLink";
import { useProfileSheet } from "../context/ProfileSheetContext";

const Profile = () => {
  const { user, setUser, authLoading, logout } = useContext(UserContext);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [listTitle, setListTitle] = useState("");
  const [people, setPeople] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    userName: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarInputRef = useRef(null);
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(null);
  const { openProfile } = useProfileSheet();

  const loadStats = async () =>
    setStats(
      (await axios.get(`${API_URL}/api/social/stats`, { withCredentials: true }))
        .data.data,
    );

  useEffect(() => {
    if (!user) return;
    loadStats().catch(() => {});
    const socket = connectSocket();
    socket.on("social:updated", loadStats);
    return () => socket.off("social:updated", loadStats);
  }, [user]);

  useEffect(() => {
    if (!user || editing) return;
    setAvatarPreview(userAvatarUrl(user));
  }, [user, editing, user?.avatar, user?.updatedAt]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      userName: user.userName || "",
      email: user.email || "",
      phone: user.phone || "",
      bio: user.bio || "",
    });
    if (!editing) {
      setAvatarFile(null);
    }
  }, [user, editing]);

  const openPeopleList = async (type) => {
    setListTitle(type);
    setListLoading(true);
    try {
      setPeople(
        (
          await axios.get(`${API_URL}/api/social/${type.toLowerCase()}`, {
            withCredentials: true,
          })
        ).data.data,
      );
    } finally {
      setListLoading(false);
    }
  };

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("userName", form.userName);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("bio", form.bio);
      if (avatarFile) payload.append("avatar", avatarFile);

      const response = await axios.patch(`${API_URL}/api/profile`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = response.data.data;
      setUser(updated);
      setAvatarPreview(userAvatarUrl(updated));
      setAvatarFile(null);
      setEditing(false);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="container mt-5">Loading profile...</div>;
  if (!user)
    return (
      <div className="container mt-5">
        Please <NavLink to="/reg">login</NavLink> to view your profile.
      </div>
    );

  return (
    <div className="profile-page">
      <MediaLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        src={lightbox?.src}
        alt={lightbox?.alt}
        mode="image"
      />
      <section className="profile-panel profile-panel--ig" aria-label="Your profile">
        <header className="profile-ig-topbar">
          <span className="profile-ig-topbar__handle">@{user.userName}</span>
        </header>

        <div className="profile-panel__body profile-panel__body--ig">
          <div className="profile-ig-hero">
            <div className="profile-avatar-wrap">
              <button
                type="button"
                className="profile-panel__avatar-btn"
                onClick={() => !editing && setLightbox({ src: avatarPreview, alt: `${user.userName} profile` })}
                aria-label={editing ? undefined : "View profile photo"}
                disabled={editing}
              >
                <img
                  className="profile-panel__avatar profile-panel__avatar--ig"
                  src={avatarPreview}
                  alt={`${user.userName} profile`}
                />
              </button>
              {editing && (
                <button
                  type="button"
                  className="profile-media-edit profile-media-edit--avatar"
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <FiCamera />
                </button>
              )}
            </div>

            <div className="profile-ig-stats" aria-label="Profile activity">
              <div className="profile-ig-stat profile-ig-stat--static">
                <strong>0</strong>
                <span>posts</span>
              </div>
              <button type="button" className="profile-ig-stat" onClick={() => openPeopleList("Followers")}>
                <strong>{stats.followers}</strong>
                <span>followers</span>
              </button>
              <button type="button" className="profile-ig-stat" onClick={() => openPeopleList("Following")}>
                <strong>{stats.following}</strong>
                <span>following</span>
              </button>
            </div>
          </div>

          {editing ? (
            <form className="profile-edit-form profile-edit-form--ig" onSubmit={saveProfile}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={onAvatarChange}
              />
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={form.userName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      userName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label className="profile-edit-form__bio">
                Bio
                <textarea
                  maxLength={280}
                  rows={3}
                  value={form.bio}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bio: event.target.value }))
                  }
                  placeholder="Write a short bio"
                />
              </label>
              <div className="profile-edit-actions">
                <button type="submit" className="profile-ig-btn profile-ig-btn--primary" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
                <button
                  type="button"
                  className="profile-ig-btn"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-ig-actions">
                <button
                  type="button"
                  className="profile-ig-btn profile-ig-btn--primary"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit2 aria-hidden="true" />
                  Edit profile
                </button>
              </div>

              <h1 className="profile-ig-name">{user.name}</h1>
              <p className="profile-bio profile-bio--ig">
                {user.bio || "Add a bio to tell people more about you."}
              </p>

              <button type="button" className="profile-panel__logout profile-panel__logout--ig" onClick={logout}>
                Log out
              </button>
            </>
          )}
        </div>
      </section>
      {listTitle && (
        <div
          className="people-modal"
          role="dialog"
          aria-modal="true"
          aria-label={listTitle}
        >
          <div className="people-modal__panel">
            <button
              className="people-modal__close"
              onClick={() => setListTitle("")}
              aria-label="Close"
            >
              ×
            </button>
            <h2>{listTitle}</h2>
            {listLoading ? (
              <p>Loading...</p>
            ) : people.length ? (
              people.map((person) => (
                <div className="people-modal__person" key={person._id}>
                  <button
                    type="button"
                    className="people-modal__person-avatar"
                    onClick={() => openProfile(person)}
                    aria-label={`View ${person.userName}'s profile`}
                  >
                    <img src={userAvatarUrl(person)} alt="" />
                  </button>
                  <div className="people-modal__person-meta">
                    <strong>
                      <UsernameLink person={person} className="username-link--strong" />
                    </strong>
                    <span>{person.name}</span>
                  </div>
                  <button
                    type="button"
                    className="people-modal__person-chat"
                    onClick={() => navigate("/chat", { state: { selectedFriend: person } })}
                  >
                    Message
                  </button>
                </div>
              ))
            ) : (
              <p>No {listTitle.toLowerCase()} yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
