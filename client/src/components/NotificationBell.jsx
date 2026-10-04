import { useEffect, useRef } from "react";
import { FiBell } from "react-icons/fi";
import { useRealtime } from "../context/RealtimeContext";

const NotificationBell = () => {
  const panelRef = useRef(null);
  const {
    notifications,
    unreadNotificationCount,
    badgeTotal,
    panelOpen,
    openNotificationPanel,
    closeNotificationPanel,
    markNotificationsRead,
    handleNotificationAction,
  } = useRealtime();

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      closeNotificationPanel();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [panelOpen, closeNotificationPanel]);

  const togglePanel = () => {
    if (panelOpen) {
      closeNotificationPanel();
      return;
    }
    openNotificationPanel();
    markNotificationsRead();
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell__btn"
        onClick={togglePanel}
        aria-label="Notifications"
        aria-expanded={panelOpen}
      >
        <FiBell size={20} />
        {badgeTotal > 0 && (
          <span className="notification-bell__dot" aria-hidden="true" />
        )}
      </button>

      {panelOpen && (
        <div className="notification-bell__panel" role="dialog" aria-label="Notifications">
          <header className="notification-bell__header">
            <strong>Notifications</strong>
            {unreadNotificationCount > 0 && (
              <span className="notification-bell__count">{unreadNotificationCount} new</span>
            )}
          </header>
          <div className="notification-bell__list">
            {notifications.length ? notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-bell__item${item.read ? "" : " notification-bell__item--unread"}`}
                onClick={() => handleNotificationAction(item)}
              >
                <span className="notification-bell__item-type">
                  {item.type === "friend_request" ? "Friend request" : "Message"}
                </span>
                <strong>
                  {item.type === "friend_request"
                    ? item.fromName || `@${item.fromUserName}`
                    : `@${item.fromUserName}`}
                </strong>
                <span>{item.preview}</span>
              </button>
            )) : (
              <p className="notification-bell__empty">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
