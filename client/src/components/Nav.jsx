import { useContext, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Users from "../pages/Users";
import Home from "../pages/Home";
import About from "../pages/About";
import Reg from "../pages/Reg";
import Profile from "../pages/Profile";
import { UserContext } from "../context/UserContext";

const Nav = () => {
  const { user, authLoading } = useContext(UserContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const linkClass = ({ isActive }) =>
    `app-nav__link${isActive ? " app-nav__link--active" : ""}`;

  return (
    <>
      <header className="app-header">
        <div className="logo">
          <NavLink to="/" className="logo-link" onClick={closeMenu}>
            <span className="logo-mark" aria-hidden="true">
              <span className="logo-mark__bubble logo-mark__bubble--front" />
              <span className="logo-mark__bubble logo-mark__bubble--back" />
            </span>
            <span className="logo-wordmark">
              Chat <strong>App</strong>
            </span>
          </NavLink>
        </div>
        <button
          type="button"
          className="app-nav__toggle"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="main-navigation"
          className={`app-nav${menuOpen ? " app-nav--open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" className={linkClass} onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/about" className={linkClass} onClick={closeMenu}>
            About
          </NavLink>
          {!authLoading && !user && (
            <NavLink to="/reg" className={linkClass} onClick={closeMenu}>
              Register
            </NavLink>
          )}
          <NavLink to="/users" className={linkClass} onClick={closeMenu}>
            Users
          </NavLink>
          <NavLink
            to="/profile"
            className={(state) => `${linkClass(state)} app-nav__account`}
            onClick={closeMenu}
          >
            {authLoading ? "Loading..." : user?.userName || "Guest"}
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/reg" element={<Reg />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<Profile />} />
        {/* <Route path="/profile/:id" element={"user id is : ", id} /> */}
      </Routes>
    </>
  );
};

export default Nav;
