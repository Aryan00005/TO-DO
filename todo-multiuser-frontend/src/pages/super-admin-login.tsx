import React, { useState } from "react";
import axios from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";

interface SuperAdminLoginProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ setUser }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/auth/admin/login", { userId, password });
      sessionStorage.setItem("jwt-token", res.data.token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate("/super-admin");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: '#fff',
        padding: '48px 32px 32px 32px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
          border: '4px solid #fff'
        }}>
          <FaShieldAlt size={40} />
        </div>
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '8px',
          marginTop: '16px'
        }}>Super Admin</h1>
        
        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '32px'
        }}>Secure access for system administrators</p>
        
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="Admin User ID"
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
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Logging in...' : 'Login as Super Admin'}
          </button>
        </form>

        {error && (
          <p style={{
            color: '#ef4444',
            marginTop: '16px',
            fontSize: '14px',
            background: '#fee2e2',
            padding: '8px 12px',
            borderRadius: '6px'
          }}>{error}</p>
        )}
        
        <div style={{
          marginTop: '24px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <Link to="/login" style={{
            color: '#667eea',
            textDecoration: 'none',
            fontWeight: '600'
          }}>← Back to User Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
