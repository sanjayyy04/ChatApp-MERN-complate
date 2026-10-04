import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import Users from "../pages/Users";
import Home from "../pages/Home";
import Reg from "../pages/Reg";
import Profile from "../pages/Profile";
import { UserContext } from "../context/UserContext";
import ChatPage from "../pages/ChatPage";
import AppDock from "./Dock";
import NotificationBell from "./NotificationBell";

const Nav = () => {
  const { user, authLoading } = useContext(UserContext);

  return (
    <>
      {user && !authLoading && (
        <div className="app-topbar">
          <NotificationBell />
        </div>
      )}
      <div className="container app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reg" element={<Reg />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </div>
      <AppDock user={user} authLoading={authLoading} />
    </>
  );
};

export default Nav;
