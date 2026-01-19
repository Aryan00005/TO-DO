import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Register from "./pages/register";
import Login from "./pages/login";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Dashboard from "./pages/dashboard-new";
import PendingApproval from "./pages/PendingApproval";
import AuthCallback from "./pages/AuthCallback";
import SetPassword from "./pages/SetPassword";
import SetCredentials from "./pages/SetCredentials";
import CompleteAccount from "./pages/CompleteAccount";

// User type (optional, for TypeScript)
interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  accountStatus?: string;
}

// 1. Load user from localStorage
const getStoredUser = (): User | null => {
  const stored = sessionStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
};

const ProtectedRoute = () => {
  const token = sessionStorage.getItem("jwt-token");
  const user = sessionStorage.getItem("user");
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  // If no user data but has token, try to fetch user data
  if (!user) {
    console.warn('Token exists but no user data found, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  return <Outlet />;
};

function App() {
  // 2. Use state for user
  const [user, setUser] = useState<User | null>(getStoredUser);
  
  // Add effect to handle missing user data
  useEffect(() => {
    const token = sessionStorage.getItem('jwt-token');
    const userStr = sessionStorage.getItem('user');
    
    if (token && !user && !userStr) {
      // If we have a token but no user data, redirect to login
      console.log('Token exists but no user data, clearing session');
      sessionStorage.removeItem('jwt-token');
      window.location.href = '/login';
    }
  }, [user]);

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
        <Route path="/admin/login" element={<AdminLogin setUser={setUser} />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/system-admin-access" element={<SuperAdminLogin setUser={setUser} />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard user={user || {_id: 'loading', name: 'Loading...', email: ''}} onLogout={handleLogout} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback setUser={setUser} />} />
        <Route path="/complete-account" element={<CompleteAccount setUser={setUser} />} />
        <Route path="/setup-password" element={<SetPassword />} />
        <Route path="/setup-credentials" element={<SetCredentials />} />
        <Route path="/pending-approval" element={<PendingApproval user={user || {_id: 'loading', name: 'Loading...', email: '', accountStatus: 'pending'}} onLogout={handleLogout} />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<Dashboard user={user || {_id: 'loading', name: 'Loading...', email: ''}} onLogout={handleLogout} />}
          />
        </Route>
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
