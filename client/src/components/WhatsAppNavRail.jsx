import { FiMessageCircle, FiSearch, FiSettings, FiUsers } from "react-icons/fi";
import { useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { UserContext } from "../context/UserContext";
import { userAvatarUrl } from "../api";
import { useWhatsAppNav } from "../hooks/useWhatsAppNav";
import { clipPathFromRailShape } from "../utils/liquidRailClip";
import { APP_NAME } from "../constants/app";

const WhatsAppNavRail = () => {
  const { user } = useContext(UserContext);
  const { chatBadge, onTabClick, isActive, pathname } = useWhatsAppNav();
  const trackRef = useRef(null);
  const [trackClip, setTrackClip] = useState("");

  const mainItems = [
    { id: "chats", label: "Chats", path: "/chats", icon: FiMessageCircle, badge: chatBadge },
    { id: "search", label: "Search", path: "/search", icon: FiSearch },
    { id: "groups", label: "Groups", path: "/groups", icon: FiUsers },
  ];

  const updateTrackClip = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const bg = track.querySelector(".crud-chat-rail__track-bg");
    if (!bg) return;

    const { width, height } = bg.getBoundingClientRect();
    const activeEl = track.querySelector("[data-rail-notch='true']");

    let notchY = null;
    if (activeEl) {
      const trackRect = bg.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      notchY = activeRect.top - trackRect.top + activeRect.height / 2;
    }

    setTrackClip(clipPathFromRailShape(width, height, notchY));
  }, []);

  useLayoutEffect(() => {
    updateTrackClip();
    const track = trackRef.current;
    if (!track) return undefined;

    const observer = new ResizeObserver(() => updateTrackClip());
    observer.observe(track);
    window.addEventListener("resize", updateTrackClip);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTrackClip);
    };
  }, [pathname, updateTrackClip]);

  const profileActive = isActive("/profile");

  const renderNavButton = ({ id, label, path, icon: Icon, badge, active, inFooter = false }) => (
    <button
      key={id}
      type="button"
      className={`crud-chat-rail__btn${active ? " crud-chat-rail__btn--active" : ""}${inFooter ? " crud-chat-rail__btn--footer" : ""}`}
      onClick={() => onTabClick(path, id)}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
      data-rail-notch={active ? "true" : undefined}
    >
      <span className="crud-chat-rail__icon-wrap">
        <Icon size={inFooter ? 22 : 24} aria-hidden="true" />
        {badge > 0 && id === "chats" ? (
          <span className="crud-chat-rail__badge" aria-label={`${badge} updates`}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="crud-chat-rail__tooltip">{label}</span>
    </button>
  );

  return (
    <aside className="crud-chat-rail" aria-label="App navigation">
      <div className="crud-chat-rail__stack">
        <div className="crud-chat-rail__brand-orbit" aria-label={APP_NAME}>
          <span className="crud-chat-rail__brand-mark" title={APP_NAME}>
            CM
          </span>
        </div>

        <div ref={trackRef} className="crud-chat-rail__track">
          <div
            className="crud-chat-rail__track-bg"
            style={{
              clipPath: trackClip || undefined,
              WebkitClipPath: trackClip || undefined,
            }}
            aria-hidden="true"
          />

          <div className="crud-chat-rail__track-inner">
            <div className="crud-chat-rail__main">
              {mainItems.map((item) =>
                renderNavButton({
                  ...item,
                  active: isActive(item.path),
                }),
              )}
            </div>

            <div className="crud-chat-rail__footer">
              {renderNavButton({
                id: "profile",
                label: "Settings",
                path: "/profile",
                icon: FiSettings,
                badge: 0,
                active: profileActive,
                inFooter: true,
              })}
              {user ? (
                <button
                  type="button"
                  className="crud-chat-rail__avatar-btn"
                  onClick={() => onTabClick("/profile", "profile")}
                  title={user.userName}
                  aria-label="Your profile"
                >
                  <img src={userAvatarUrl(user)} alt="" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default WhatsAppNavRail;
