import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Register from "./pages/register";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard-new";
import AuthCallback from "./pages/AuthCallback";
import SetPassword from "./pages/SetPassword";
import SetCredentials from "./pages/SetCredentials";
import CompleteAccount from "./pages/CompleteAccount";
import SuperAdminLogin from "./pages/super-admin-login";
import SuperAdminDashboard from "./pages/super-admin-dashboard";

// User type (optional, for TypeScript)
interface User {
  _id: string;
  name: string;
  email: string;
}

// 1. Load user from localStorage
const getStoredUser = (): User | null => {
  const stored = sessionStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
};

const ProtectedRoute = () => {
  const token = sessionStorage.getItem("jwt-token");
  return token ? <Outlet /> : <Navigate to="/login" />;
};

const SuperAdminRoute = () => {
  const token = sessionStorage.getItem("jwt-token");
  const user = sessionStorage.getItem("user");
  const isSuperAdmin = user ? JSON.parse(user).isSuperAdmin : false;
  return token && isSuperAdmin ? <Outlet /> : <Navigate to="/super-admin-login" />;
};

function App() {
  // 2. Use state for user
  const [user, setUser] = useState<User | null>(getStoredUser);

  // Optional: Keep user state in sync with localStorage (for multi-tab support)
  useEffect(() => {
    const syncUser = () => {
      const stored = sessionStorage.getItem("user");
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  // 3. Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("jwt-token");
    setUser(null);
  };

  // 4. Pass user and onLogout to Dashboard
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin setUser={setUser} />} />
        <Route path="/auth/callback" element={<AuthCallback setUser={setUser} />} />
        <Route path="/complete-account" element={<CompleteAccount setUser={setUser} />} />
        <Route path="/setup-password" element={<SetPassword />} />
        <Route path="/setup-credentials" element={<SetCredentials />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<Dashboard user={user} onLogout={handleLogout} />}
          />
        </Route>
        <Route element={<SuperAdminRoute />}>
          <Route
            path="/super-admin"
            element={<SuperAdminDashboard user={user} onLogout={handleLogout} />}
          />
        </Route>
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
