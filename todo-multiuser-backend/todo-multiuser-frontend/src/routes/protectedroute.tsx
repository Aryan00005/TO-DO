import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("jwt-token");
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
