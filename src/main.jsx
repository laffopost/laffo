import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "../src/firebase/config.js"; // Initialize Firebase first

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
