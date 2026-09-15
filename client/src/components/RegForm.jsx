import React, { useContext } from "react";
import { useState } from "react";
import { FaEye } from "react-icons/fa6";
import { FaEyeLowVision } from "react-icons/fa6";
import "../App.css";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";

const RegForm = () => {
  const { setUser } = useContext(UserContext);
  const [isRegistering, setIsRegistering] = useState(true);
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // console.log(formData);
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/create",
        formData,
      );
      toast.success(response.data.message);
      setIsRegistering(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
      console.error("Error sending data:", error);
    }
  };
  const handleLogin = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/login",
        formData,
        { withCredentials: true },
      );

      const profileResponse = await axios.get(
        "http://localhost:3000/api/profile",
        { withCredentials: true },
      );

      toast.success(response.data.message);
      setUser(profileResponse.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      console.error("Error sending data:", error);
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

  const togglePassword = () => {
    setShowPassword((current) => !current);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "450px" }}>
      <h2>{isRegistering ? "Create account" : "Welcome back"}</h2>

      <form onSubmit={handleSubmit}>
        {isRegistering ? (
          <>
            <input
              type="text"
              className="form-control mb-3"
              name="userName"
              placeholder="Username"
              onChange={handleChange}
              required
            />

            <input
              type="text"
              className="form-control mb-3"
              name="name"
              placeholder="Full name"
              onChange={handleChange}
              required
            />

            <input
              type="email"
              className="form-control mb-3"
              name="email"
              placeholder="Email"
              onChange={handleChange}
              required
            />

            <input
              type="number"
              className="form-control mb-3"
              name="phone"
              placeholder="Phone"
              onChange={handleChange}
              required
              maxLength={12}
              minLength={10}
            />
            <input
              type={showPassword ? "text" : "password"}
              className="form-control mb-3"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />
          </>
        ) : (
          <>
            <input
              className="form-control mb-3"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email || ""}
              onChange={handleChange}
              required
            />

            <div className="password-wrapper">
              <input
                className="form-control mb-3"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password || ""}
                onChange={handleChange}
                required
              />
              <span
                aria-label="button"
                type="button"
                onClick={togglePassword}
                className="togglePassword"
              >
                {showPassword ? <FaEyeLowVision /> : <FaEye />}
              </span>
            </div>
          </>
        )}

        <button className="btn btn-primary w-100" type="submit">
          {isRegistering ? "Register" : "Login"}
        </button>
      </form>

      <button
        type="button"
        className="btn btn-link w-100 mt-3"
        onClick={() => setIsRegistering((current) => !current)}
      >
        {isRegistering
          ? "Already have an account? Login"
          : "New user? Create an account"}
      </button>
    </div>
  );
};

export default RegForm;
