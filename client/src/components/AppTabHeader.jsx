import { FiMoreVertical } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { APP_NAME } from "../constants/app";
import { useMobilePageHeader } from "../context/MobilePageHeaderContext";

const getTitle = (pathname) => {
  if (pathname === "/chats" || pathname === "/chat") return "Chats";
  if (pathname === "/groups") return "Groups";
  if (pathname === "/search") return "Search";
  if (pathname === "/profile") return "Profile";
  return APP_NAME;
};

const AppTabHeader = () => {
  const { pathname } = useLocation();
  const title = getTitle(pathname);
  const { headerActions } = useMobilePageHeader();
  const onChats = pathname === "/chats" || pathname === "/chat";
  const hasActions = onChats || headerActions;

  return (
    <header className="crud-chat-shell__header crud-chat-shell__header--mobile-only">
      <h1
        className={`crud-chat-shell__header-title${
          pathname === "/search" ? " crud-chat-shell__header-title--search" : ""
        }`}
      >
        {title}
      </h1>
      {hasActions ? (
        <div className="crud-chat-shell__header-actions">
          {headerActions}
          {onChats ? (
            <>
              <NotificationBell />
              <button
                type="button"
                className="crud-chat-shell__header-menu"
                aria-label="Menu"
                title="Menu"
              >
                <FiMoreVertical size={20} />
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <span className="crud-chat-shell__header-spacer" aria-hidden="true" />
      )}
    </header>
  );
};

export default AppTabHeader;
