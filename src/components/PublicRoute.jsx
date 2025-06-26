import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

export default function PublicRoute({ children }) {
  const token = Cookies.get("token");
  const isAuthenticated = !!token; // true if token exists

  return isAuthenticated ? <Navigate to="/home" /> : children;
}
