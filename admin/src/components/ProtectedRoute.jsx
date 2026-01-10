import { Navigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    // No token, redirect to login
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    console.log(decoded);

    if (decoded.role !== "admin") {
      // Token exists but role is not admin
      return <Navigate to="/admin/login" replace />;
    }

    // Token exists and user is admin
    return children;
  } catch (error) {
    // Invalid token
    console.error("Invalid token:", error);
    return <Navigate to="/admin/login" replace />;
  }
};

export default ProtectedRoute;
