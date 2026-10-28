import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FiCamera,
  FiLogOut,
} from "react-icons/fi";
import { UserContext } from "../context/UserContext";
import { API_URL, userAvatarUrl } from "../api";
import { toast } from "react-toastify";
import MediaLightbox from "../components/MediaLightbox";
import ProfileFriendsSection from "../components/ProfileFriendsSection";
import { APP_DEFAULT_STATUS } from "../constants/app";
import { useMobilePageHeader } from "../context/MobilePageHeaderContext";

const Profile = () => {
  const { user, setUser, authLoading, logout } = useContext(UserContext);
  const { setHeaderActions } = useMobilePageHeader();
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
  const [lightbox, setLightbox] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);

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

  useEffect(() => {
    document.body.classList.toggle("crud-chat-mobile-profile-edit", editing);
    return () => document.body.classList.remove("crud-chat-mobile-profile-edit");
  }, [editing]);

  useEffect(() => {
    if (editing) {
      setHeaderActions(null);
      return undefined;
    }
    setHeaderActions(
      <button
        type="button"
        className="crud-chat-shell__header-text-btn"
        onClick={() => setEditing(true)}
      >
        Edit
      </button>,
    );
    return () => setHeaderActions(null);
  }, [editing, setHeaderActions]);

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    if (user) setAvatarPreview(userAvatarUrl(user));
  };

  const saveProfile = async (event) => {
    event?.preventDefault();
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

  const updateNotificationPref = async (key, value) => {
    setNotifSaving(true);
    try {
      const response = await axios.patch(
        `${API_URL}/api/profile/notifications`,
        { notificationPreferences: { [key]: value } },
        { withCredentials: true },
      );
      setUser(response.data.data);
      toast.success("Notification settings saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save settings.");
    } finally {
      setNotifSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="crud-chat-profile-loading" role="status">
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="crud-chat-profile-loading">
        Please log in to view your profile.
      </div>
    );
  }

  const statusLine = user.bio?.trim() || APP_DEFAULT_STATUS;
  const prefs = user.notificationPreferences || {};

  return (
    <div className="crud-chat-page-wrap">
      <div className="crud-chat-pane-layout crud-chat-pane-layout--settings">
        <nav className="crud-chat-settings-nav" aria-label="Settings">
          <header className="crud-chat-pane-header">
            <h2 className="crud-chat-pane-header__title">Settings</h2>
          </header>
          <div className="crud-chat-settings-nav__profile" aria-hidden={editing}>
            <img src={avatarPreview} alt="" />
            <div>
              <strong>{user.name}</strong>
              <span>{statusLine}</span>
            </div>
          </div>
          <button type="button" className="crud-chat-settings-nav__item crud-chat-settings-nav__item--active">
            Profile
          </button>
          <button
            type="button"
            className="crud-chat-settings-nav__item crud-chat-settings-nav__item--danger"
            onClick={() => logout?.()}
          >
            Log out
          </button>
        </nav>

        <div className="crud-chat-pane-layout__detail crud-chat-profile-page">
          <MediaLightbox
            open={Boolean(lightbox)}
            onClose={() => setLightbox(null)}
            src={lightbox?.src}
            alt={lightbox?.alt}
            mode="image"
          />

          <header className="crud-chat-profile-desktop-bar">
            <h1>{editing ? "Edit profile" : "Profile"}</h1>
            {editing ? (
              <div className="crud-chat-profile-desktop-bar__actions">
                <button type="button" className="crud-chat-profile-toolbar__text" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="crud-chat-profile-toolbar__text crud-chat-profile-toolbar__text--accent"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="crud-chat-profile-desktop-bar__edit"
                onClick={() => setEditing(true)}
              >
                Edit profile
              </button>
            )}
          </header>

          <header
            className={`crud-chat-profile-toolbar${editing ? " crud-chat-profile-toolbar--edit-mode" : ""}`}
          >
            {editing ? (
              <>
                <button type="button" className="crud-chat-profile-toolbar__text" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <h1 className="crud-chat-profile-toolbar__title">Edit profile</h1>
                <button
                  type="button"
                  className="crud-chat-profile-toolbar__text crud-chat-profile-toolbar__text--accent"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Done"}
                </button>
              </>
            ) : (
              <>
                <span className="crud-chat-profile-toolbar__spacer" aria-hidden="true" />
                <h1 className="crud-chat-profile-toolbar__title">Profile</h1>
                <button
                  type="button"
                  className="crud-chat-profile-toolbar__text crud-chat-profile-toolbar__text--accent crud-chat-profile-toolbar__text--desktop-only"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              </>
            )}
          </header>

          <div className="crud-chat-profile-scroll">
          <form className="crud-chat-profile" onSubmit={saveProfile}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={onAvatarChange}
            />

            <div className="crud-chat-profile-hero-wrap">
              <button
                type="button"
                className="crud-chat-profile-hero"
                onClick={() => {
                  if (editing) avatarInputRef.current?.click();
                  else setLightbox({ src: avatarPreview, alt: `${user.userName} profile` });
                }}
              >
                <span className="crud-chat-profile-hero__avatar-wrap">
                  <img src={avatarPreview} alt="" className="crud-chat-profile-hero__avatar" />
                  {editing ? (
                    <span className="crud-chat-profile-hero__camera" aria-hidden="true">
                      <FiCamera />
                    </span>
                  ) : null}
                </span>
                <span className="crud-chat-profile-hero__text">
                  <strong>{editing ? form.name || user.name : user.name}</strong>
                  <span className="crud-chat-profile-hero__status">
                    {editing ? form.bio || "Add a few words about yourself" : statusLine}
                  </span>
                </span>
              </button>
            </div>

            {editing ? (
              <>
                <p className="crud-chat-profile-section-label">Your name and about</p>
                <section className="crud-chat-profile-section">
                  <label className="crud-chat-profile-field">
                    <span>Name</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                      required
                      autoComplete="name"
                    />
                  </label>
                  <label className="crud-chat-profile-field crud-chat-profile-field--about">
                    <span>About</span>
                    <textarea
                      maxLength={280}
                      rows={3}
                      value={form.bio}
                      onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))}
                      placeholder="About"
                    />
                  </label>
                </section>

                <p className="crud-chat-profile-section-label">Account</p>
                <section className="crud-chat-profile-section">
                  <label className="crud-chat-profile-field">
                    <span>Username</span>
                    <input
                      value={form.userName}
                      onChange={(e) => setForm((c) => ({ ...c, userName: e.target.value }))}
                      required
                      autoComplete="username"
                    />
                  </label>
                  <label className="crud-chat-profile-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label className="crud-chat-profile-field">
                    <span>Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                      autoComplete="tel"
                    />
                  </label>
                </section>
              </>
            ) : (
              <>
                <p className="crud-chat-profile-section-label">Profile</p>
                <section className="crud-chat-profile-section">
                  <div className="crud-chat-profile-row">
                    <span className="crud-chat-profile-row__label">Name</span>
                    <span className="crud-chat-profile-row__value">{user.name}</span>
                  </div>
                  <div className="crud-chat-profile-row crud-chat-profile-row--multiline">
                    <span className="crud-chat-profile-row__label">About</span>
                    <span className="crud-chat-profile-row__value">{statusLine}</span>
                  </div>
                </section>

                <p className="crud-chat-profile-section-label">Account</p>
                <section className="crud-chat-profile-section">
                  <div className="crud-chat-profile-row">
                    <span className="crud-chat-profile-row__label">Phone</span>
                    <span className="crud-chat-profile-row__value">{user.phone || "—"}</span>
                  </div>
                  <div className="crud-chat-profile-row">
                    <span className="crud-chat-profile-row__label">Username</span>
                    <span className="crud-chat-profile-row__value">@{user.userName}</span>
                  </div>
                  <div className="crud-chat-profile-row crud-chat-profile-row--multiline">
                    <span className="crud-chat-profile-row__label">Email</span>
                    <span className="crud-chat-profile-row__value">{user.email}</span>
                  </div>
                </section>

                <p className="crud-chat-profile-section-label">Notifications</p>
                <section className="crud-chat-profile-section crud-chat-profile-section--notifications">
                  <label className="crud-chat-profile-toggle-row">
                    <span>
                      <strong>Login alerts</strong>
                      <small>Email when someone signs in to your account</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.emailLoginAlerts !== false}
                      disabled={notifSaving}
                      onChange={(e) => updateNotificationPref("emailLoginAlerts", e.target.checked)}
                    />
                  </label>
                  <label className="crud-chat-profile-toggle-row">
                    <span>
                      <strong>Security alerts</strong>
                      <small>Email for password or account changes</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.emailSecurityAlerts !== false}
                      disabled={notifSaving}
                      onChange={(e) => updateNotificationPref("emailSecurityAlerts", e.target.checked)}
                    />
                  </label>
                  <label className="crud-chat-profile-toggle-row">
                    <span>
                      <strong>Unread messages (offline)</strong>
                      <small>Batched email when you are away — no message content</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.emailUnreadMessages === true}
                      disabled={notifSaving}
                      onChange={(e) => updateNotificationPref("emailUnreadMessages", e.target.checked)}
                    />
                  </label>
                </section>

                <ProfileFriendsSection />

                <section className="crud-chat-profile-section crud-chat-profile-section--mobile-logout">
                  <button type="button" className="crud-chat-profile-link crud-chat-profile-link--danger" onClick={logout}>
                    <FiLogOut aria-hidden="true" />
                    <span className="crud-chat-profile-link__label">Log out</span>
                  </button>
                </section>
              </>
            )}
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
