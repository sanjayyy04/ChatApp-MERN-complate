import React, { useContext, useState } from "react";
import { FaEye, FaEyeLowVision } from "react-icons/fa6";
import "../App.css";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import { API_URL } from "../api";
import { setAuthToken } from "../services/authToken";
import { useNavigate, useSearchParams } from "react-router-dom";

const COUNTRY_CODES = [
  { code: "91", label: "India (+91)" },
  { code: "1", label: "US / Canada (+1)" },
  { code: "44", label: "UK (+44)" },
  { code: "61", label: "Australia (+61)" },
  { code: "971", label: "UAE (+971)" },
];

const emptyForm = {
  countryCode: "91",
  userName: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  identifier: "",
};

const RegForm = () => {
  const { setUser } = useContext(UserContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/chats";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleRegisterMode = () => {
    setIsRegistering((current) => !current);
    setFormData((prev) => ({
      ...emptyForm,
      countryCode: prev.countryCode || "91",
      identifier: prev.identifier || prev.email || "",
      password: prev.password || "",
    }));
  };

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        {
          userName: formData.userName,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          countryCode: formData.countryCode || "91",
          password: formData.password,
        },
        { withCredentials: true },
      );
      if (response.data?.token) {
        setAuthToken(response.data.token);
      }
      const profileResponse = await axios.get(`${API_URL}/api/profile`, { withCredentials: true });
      setUser(profileResponse.data.data);
      toast.success(response.data.message);
      const safeRedirect = redirectPath.startsWith("/") ? redirectPath : "/chats";
      navigate(safeRedirect, { replace: true });
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        toast.error("Auth API not found. Restart the server (port 3000) so /api/auth routes load.");
      } else {
        toast.error(error.response?.data?.message || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login/start`,
        {
          identifier: formData.identifier,
          password: formData.password,
        },
        { withCredentials: true },
      );
      if (response.data?.token) {
        setAuthToken(response.data.token);
      }
      const profileResponse = await axios.get(`${API_URL}/api/profile`, { withCredentials: true });
      setUser(profileResponse.data.data);
      toast.success(response.data.message);
      const safeRedirect = redirectPath.startsWith("/") ? redirectPath : "/chats";
      navigate(safeRedirect, { replace: true });
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Auth API not found. Restart the server on port 3000.");
      } else {
        toast.error(error.response?.data?.message || "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isRegistering) {
      await handleRegister();
    } else {
      await handleLogin();
    }
  };

  return (
    <div className="crud-chat-auth-form">
      <h2 className="crud-chat-auth-form__title">
        {isRegistering ? "Create account" : "Welcome back"}
      </h2>
      {redirectPath.includes("invite=") && !isRegistering ? (
        <p className="crud-chat-auth-form__invite-hint">
          Log in or register to accept a group invite. Only registered users can join groups.
        </p>
      ) : null}

      <form className="crud-chat-auth-form" onSubmit={handleSubmit}>
        {isRegistering ? (
          <>
            <input
              type="text"
              className="form-control crud-chat-auth-form__input mb-3"
              name="userName"
              placeholder="Username"
              value={formData.userName}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              className="form-control crud-chat-auth-form__input mb-3"
              name="name"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              className="form-control crud-chat-auth-form__input mb-3"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <div className="crud-chat-auth-form__phone-row mb-3">
              <select
                className="form-select crud-chat-auth-form__country"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                className="form-control crud-chat-auth-form__input crud-chat-auth-form__phone"
                name="phone"
                placeholder="Mobile number"
                value={formData.phone}
                onChange={handleChange}
                required
                inputMode="numeric"
              />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              className="form-control crud-chat-auth-form__input mb-3"
              name="password"
              placeholder="Password (min. 8 characters)"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </>
        ) : (
          <>
            <input
              className="form-control crud-chat-auth-form__input mb-3"
              type="text"
              name="identifier"
              placeholder="Email or mobile number"
              value={formData.identifier}
              onChange={handleChange}
              autoComplete="username"
              required
            />
            <div className="crud-chat-password-wrap">
              <input
                className="form-control crud-chat-auth-form__input mb-3"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <span
                aria-label="button"
                role="button"
                tabIndex={0}
                onClick={() => setShowPassword((c) => !c)}
                onKeyDown={(e) => e.key === "Enter" && setShowPassword((c) => !c)}
                className="crud-chat-password-toggle"
              >
                {showPassword ? <FaEyeLowVision /> : <FaEye />}
              </span>
            </div>
          </>
        )}

        <button
          className="btn btn-primary crud-chat-auth-form__submit w-100"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Please wait…" : isRegistering ? "Register" : "Login"}
        </button>
      </form>

      <button
        type="button"
        className="btn btn-link crud-chat-auth-form__toggle w-100 mt-3"
        onClick={toggleRegisterMode}
      >
        {isRegistering
          ? "Already have an account? Login"
          : "New user? Create an account"}
      </button>
    </div>
  );
};

export default RegForm;
