import React from "react";
import { BrowserRouter } from "react-router-dom";
import Nav from "./components/Nav";
import UserProvider from "./context/UserContext";
import ProfileSheetProvider from "./context/ProfileSheetContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const basename = import.meta.env.BASE_URL;

const App = () => {
  return (
    <BrowserRouter basename={basename}>
      <UserProvider>
        <ProfileSheetProvider>
          <Nav />
          <ToastContainer position="bottom-right" autoClose={2000} />
        </ProfileSheetProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

export default App;
