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
      background: '#f8fafc'
    }}>
      <div style={{
        background: '#fff',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <FaShieldAlt size={32} style={{ color: '#3b82f6', marginBottom: '8px' }} />
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>Super Admin Login</h1>
        </div>
        
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#3b82f6',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {error && (
          <p style={{
            color: '#ef4444',
            marginTop: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>{error}</p>
        )}
        
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <Link to="/login" style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
