import { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Reg from "../pages/Reg";
import Profile from "../pages/Profile";
import { UserContext } from "../context/UserContext";
import ChatPage from "../pages/ChatPage";
import GroupsPage from "../pages/GroupsPage";
import SearchPage from "../pages/SearchPage";
import WhatsAppTabs from "./WhatsAppTabs";
import WhatsAppNavRail from "./WhatsAppNavRail";
import AppTabHeader from "./AppTabHeader";
import GuestInviteGate from "./GuestInviteGate";

const AuthLoading = () => (
  <div className="crud-chat-auth-loading" role="status" aria-live="polite">
    Loading…
  </div>
);

const GuestRoutes = () => (
  <div className="crud-chat-root crud-chat-root--auth">
    <Routes>
      <Route path="/login" element={<Reg />} />
      <Route path="/reg" element={<Navigate to="/login" replace />} />
      <Route path="/groups" element={<GuestInviteGate />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </div>
);

const AppRoutes = () => (
  <div className="crud-chat-shell">
    <WhatsAppNavRail />
    <div className="crud-chat-shell__viewport">
      <AppTabHeader />
      <main className="crud-chat-shell__main">
        <Routes>
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="/chats" element={<ChatPage />} />
          <Route path="/chat" element={<Navigate to="/chats" replace />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/users" element={<Navigate to="/search" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Navigate to="/chats" replace />} />
          <Route path="/reg" element={<Navigate to="/chats" replace />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </main>
      <div className="crud-chat-shell__tabs crud-chat-shell__tabs--mobile">
        <WhatsAppTabs />
      </div>
    </div>
  </div>
);

const Nav = () => {
  const { user, authLoading } = useContext(UserContext);

  if (authLoading) {
    return <AuthLoading />;
  }

  return user ? <AppRoutes /> : <GuestRoutes />;
};

export default Nav;
