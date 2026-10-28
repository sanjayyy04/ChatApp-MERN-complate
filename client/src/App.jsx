import React from "react";
import { BrowserRouter } from "react-router-dom";
import Nav from "./components/Nav";
import UserProvider from "./context/UserContext";
import ProfileSheetProvider from "./context/ProfileSheetContext";
import { MobilePageHeaderProvider } from "./context/MobilePageHeaderContext";
import RealtimeProvider from "./context/RealtimeContext";
import { NotificationPanelHost } from "./components/NotificationBell";
import AppAmbient from "./components/AppAmbient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import "./styles/liquid-rail.css";

const basename = import.meta.env.BASE_URL;

const App = () => {
  return (
    <BrowserRouter basename={basename}>
      <AppAmbient />
      <UserProvider>
        <RealtimeProvider>
          <ProfileSheetProvider>
            <MobilePageHeaderProvider>
              <Nav />
              <NotificationPanelHost />
            </MobilePageHeaderProvider>
            <ToastContainer
              position="bottom-right"
              autoClose={2000}
              toastClassName="crud-chat-toast"
              progressClassName="crud-chat-toast__progress"
            />
          </ProfileSheetProvider>
        </RealtimeProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

export default App;
