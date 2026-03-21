import React, { useState } from "react";
import axios from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserCircle, FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSlowConnection(false);
    const slowTimer = setTimeout(() => setSlowConnection(true), 4000);
    try {
      const res = await axios.post("/auth/login", { userId, password });
      sessionStorage.setItem("jwt-token", res.data.token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);

      if (res.data.user.accountStatus === 'pending') {
        navigate("/pending-approval");
        return;
      }

      if (res.data.user.isSuperAdmin) {
        navigate("/superadmin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        // @ts-ignore
        err.response?.data?.message
      ) {
        // @ts-ignore
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowConnection(false);
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseURL = axios.defaults.baseURL || 'https://to-do-1-26zv.onrender.com';
    window.location.href = `${baseURL}/auth/google`;
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc'
    }}>
      <div style={{
        background: '#fff',
        padding: '48px 32px 32px 32px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          background: '#3b82f6',
          color: '#fff',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          border: '4px solid #fff'
        }}>
          <FaUserCircle size={40} />
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '32px',
          marginTop: '16px'
        }}>Welcome Back</h1>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            background: '#fff',
            color: '#374151',
            padding: '12px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = '#3b82f6';
            (e.target as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = '#e5e7eb';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <FaGoogle style={{ color: '#ea4335' }} />
          Continue with Google
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          color: '#9ca3af'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          <span style={{ padding: '0 16px', fontSize: '14px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="User ID or Email"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                paddingRight: '45px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '16px'
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {loading && (
              <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
              </svg>
            )}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Slow connection warning */}
        {slowConnection && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⏳ Server is waking up, please wait a moment...
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {error && (
          <p style={{
            color: '#ef4444',
            marginTop: '16px',
            fontSize: '14px'
          }}>{error}</p>
        )}

        <div style={{
          marginTop: '24px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '600'
          }}>Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
