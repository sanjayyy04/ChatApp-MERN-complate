import { useContext } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Users from "../pages/Users";
import Home from "../pages/Home";
import About from "../pages/About";
import Reg from "../pages/Reg";
import Profile from "../pages/Profile";
import { UserContext } from "../context/UserContext";

const Nav = () => {
  const { user, authLoading } = useContext(UserContext);

  return (
    <>
      <header className="d-flex justify-content-between py-3">
        <div className="logo">
          <NavLink to="/" className="text-decoration-none text-black">
            Chat App
          </NavLink>
        </div>
        <nav className="d-flex gap-5">
          <NavLink to="/" className="text-decoration-none text-black">
            Home
          </NavLink>
          <NavLink to="/about" className="text-decoration-none text-black">
            About
          </NavLink>
          {!authLoading && !user && (
            <NavLink to="/reg" className="text-decoration-none text-black">
              Register
            </NavLink>
          )}
          <NavLink to="/users" className="text-decoration-none text-black">
            Users
          </NavLink>
          <NavLink to="/profile" className="text-decoration-none text-black">
            | {authLoading ? "Loading..." : user?.userName || "Guest"}
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/reg" element={<Reg />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
};

export default Nav;
