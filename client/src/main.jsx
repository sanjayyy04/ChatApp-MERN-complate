import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./api.js";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <>
    <App />
  </>,
);
