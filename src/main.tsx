import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import ManagerDashboard from "./pages/ManagerDashboard";
import AthleteDashboard from "./pages/AthleteDashboard";
import Login from "./pages/Login";
import JoinTeam from "./pages/JoinTeam";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import ProtectedRoute from "./components/ProtectedRoute";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
