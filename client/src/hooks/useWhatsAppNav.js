import { useLocation, useNavigate } from "react-router-dom";
import { useRealtime } from "../context/RealtimeContext";
import { useProfileSheet } from "../context/ProfileSheetContext";

export const useWhatsAppNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { closeProfile } = useProfileSheet();
  const { unreadMessageTotal, pendingRequestCount } = useRealtime();
  const chatBadge = unreadMessageTotal + pendingRequestCount;

  const goToChatsList = () => {
    closeProfile();
    navigate("/chats", { replace: true, state: { resetThread: true } });
  };

  const goToGroupsList = () => {
    closeProfile();
    navigate("/groups", { replace: true, state: { resetGroup: true } });
  };

  const onTabClick = (path, id) => {
    if (id === "chats") {
      goToChatsList();
      return;
    }
    if (id === "groups") {
      goToGroupsList();
      return;
    }
    closeProfile();
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/chats") {
      return location.pathname === "/chats" || location.pathname === "/chat";
    }
    if (path === "/groups") {
      return location.pathname === "/groups";
    }
    if (path === "/search") {
      return location.pathname === "/search";
    }
    return location.pathname === path;
  };

  return { chatBadge, goToChatsList, goToGroupsList, onTabClick, isActive, pathname: location.pathname };
};
