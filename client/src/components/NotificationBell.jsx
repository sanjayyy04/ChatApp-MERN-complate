import { useEffect, useRef, useState } from "react";
import { FiBell, FiTrash2 } from "react-icons/fi";
import { useRealtime } from "../context/RealtimeContext";

const SWIPE_DELETE_THRESHOLD = 72;

const SwipeNotificationRow = ({ item, onDismiss, onOpen }) => {
  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const [offset, setOffset] = useState(0);

  const onTouchStart = (event) => {
    startXRef.current = event.touches[0].clientX;
    draggingRef.current = true;
  };

  const onTouchMove = (event) => {
    if (!draggingRef.current) return;
    const delta = event.touches[0].clientX - startXRef.current;
    setOffset(Math.min(0, delta));
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    if (offset <= -SWIPE_DELETE_THRESHOLD) {
      onDismiss(item.id);
    }
    setOffset(0);
  };

  return (
    <div className="notification-bell__swipe-wrap">
      <div className="notification-bell__swipe-delete" aria-hidden="true">
        <FiTrash2 />
      </div>
      <button
        type="button"
        className={`notification-bell__item${item.read ? "" : " notification-bell__item--unread"}`}
        style={{ transform: `translateX(${offset}px)` }}
        onClick={() => onOpen(item)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
    </div>
  );
};

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
    dismissNotification,
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
              <SwipeNotificationRow
                key={item.id}
                item={item}
                onDismiss={dismissNotification}
                onOpen={handleNotificationAction}
              />
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
