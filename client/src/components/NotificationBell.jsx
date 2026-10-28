import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiBell, FiTrash2 } from "react-icons/fi";
import { useRealtime } from "../context/RealtimeContext";

const SWIPE_DELETE_THRESHOLD = 72;
const PANEL_WIDTH = 352;
const PANEL_GAP_PX = 8;
const PANEL_MAX_HEIGHT = 384;

/** Shared anchor + bell roots so only one panel is portaled app-wide. */
let panelAnchorEl = null;
const bellRootElements = new Set();

const setPanelAnchor = (element) => {
  panelAnchorEl = element;
};

const registerBellRoot = (element) => {
  if (element) bellRootElements.add(element);
  return () => {
    if (element) bellRootElements.delete(element);
  };
};

const isInsideAnyBellRoot = (target) => {
  for (const root of bellRootElements) {
    if (root.contains(target)) return true;
  }
  return false;
};

const computePanelPosition = () => {
  const btn = panelAnchorEl;
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  const width = Math.min(window.innerWidth * 0.92, PANEL_WIDTH);
  const maxHeight = Math.min(window.innerHeight * 0.7, PANEL_MAX_HEIGHT);
  const margin = PANEL_GAP_PX;

  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  let top = rect.bottom + margin;
  if (top + maxHeight > window.innerHeight - margin) {
    top = rect.top - margin - maxHeight;
  }
  top = Math.max(margin, top);

  return { top, left, width, maxHeight };
};

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
    <div className="crud-chat-notification-bell__swipe-wrap">
      <div className="crud-chat-notification-bell__swipe-delete" aria-hidden="true">
        <FiTrash2 />
      </div>
      <button
        type="button"
        className={`crud-chat-notification-bell__item${item.read ? "" : " crud-chat-notification-bell__item--unread"}`}
        style={{ transform: `translateX(${offset}px)` }}
        onClick={() => onOpen(item)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <span className="crud-chat-notification-bell__item-type">
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

export const NotificationPanelHost = () => {
  const panelRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState(null);
  const {
    notifications,
    unreadNotificationCount,
    panelOpen,
    closeNotificationPanel,
    handleNotificationAction,
    dismissNotification,
  } = useRealtime();

  const updatePanelPosition = useCallback(() => {
    setPanelPosition(computePanelPosition());
  }, []);

  useLayoutEffect(() => {
    if (!panelOpen) {
      setPanelPosition(null);
      return undefined;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [panelOpen, updatePanelPosition]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target) || isInsideAnyBellRoot(target)) return;
      closeNotificationPanel();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [panelOpen, closeNotificationPanel]);

  if (!panelOpen || !panelPosition) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="crud-chat-notification-bell__panel crud-chat-notification-bell__panel--fixed"
      role="dialog"
      aria-label="Notifications"
      style={{
        top: panelPosition.top,
        left: panelPosition.left,
        width: panelPosition.width,
        maxHeight: panelPosition.maxHeight,
      }}
    >
      <header className="crud-chat-notification-bell__header">
        <strong>Notifications</strong>
        {unreadNotificationCount > 0 && (
          <span className="crud-chat-notification-bell__count">{unreadNotificationCount} new</span>
        )}
      </header>
      <div className="crud-chat-notification-bell__list">
        {notifications.length ? notifications.map((item) => (
          <SwipeNotificationRow
            key={item.id}
            item={item}
            onDismiss={dismissNotification}
            onOpen={handleNotificationAction}
          />
        )) : (
          <p className="crud-chat-notification-bell__empty">No notifications yet.</p>
        )}
      </div>
    </div>,
    document.body,
  );
};

const NotificationBell = () => {
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const {
    badgeTotal,
    panelOpen,
    openNotificationPanel,
    closeNotificationPanel,
    markNotificationsRead,
  } = useRealtime();

  useEffect(() => {
    const root = rootRef.current;
    return registerBellRoot(root);
  }, []);

  const togglePanel = () => {
    if (panelOpen) {
      closeNotificationPanel();
      return;
    }
    setPanelAnchor(btnRef.current);
    openNotificationPanel();
    markNotificationsRead();
  };

  return (
    <div className="crud-chat-notification-bell" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="crud-chat-notification-bell__btn"
        onClick={togglePanel}
        aria-label="Notifications"
        aria-expanded={panelOpen}
      >
        <FiBell size={20} />
        {badgeTotal > 0 && (
          <span className="crud-chat-notification-bell__dot" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default NotificationBell;
