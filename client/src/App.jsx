import React from "react";
import { BrowserRouter } from "react-router-dom";
import Nav from "./components/Nav";
import UserProvider from "./context/UserContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const basename = import.meta.env.BASE_URL;

const App = () => {
  return (
    <BrowserRouter basename={basename}>
      <UserProvider>
        <div className="container">
          <Nav />
        </div>
        <ToastContainer position="bottom-right" autoClose={2000} />
      </UserProvider>
    </BrowserRouter>
  );
};

export default App;
