import { FiMessageCircle, FiSearch, FiUser, FiUsers } from "react-icons/fi";
import { useWhatsAppNav } from "../hooks/useWhatsAppNav";

const WhatsAppTabs = () => {
  const { chatBadge, onTabClick, isActive } = useWhatsAppNav();

  const tabs = [
    {
      id: "chats",
      label: "Chats",
      path: "/chats",
      icon: FiMessageCircle,
      badge: chatBadge,
    },
    {
      id: "search",
      label: "Search",
      path: "/search",
      icon: FiSearch,
    },
    {
      id: "groups",
      label: "Groups",
      path: "/groups",
      icon: FiUsers,
    },
    {
      id: "profile",
      label: "Profile",
      path: "/profile",
      icon: FiUser,
    },
  ];

  return (
    <nav className="crud-chat-tabs" aria-label="Main navigation">
      {tabs.map(({ id, label, path, icon: Icon, badge }) => {
        const active = isActive(path);
        return (
          <button
            key={id}
            type="button"
            className={`crud-chat-tabs__item${active ? " crud-chat-tabs__item--active" : ""}`}
            onClick={() => onTabClick(path, id)}
            aria-current={active ? "page" : undefined}
          >
            <span className="crud-chat-tabs__icon-wrap">
              <Icon size={22} aria-hidden="true" />
              {badge > 0 && id === "chats" ? (
                <span className="crud-chat-tabs__badge" aria-label={`${badge} updates`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </span>
            <span className="crud-chat-tabs__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default WhatsAppTabs;
