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
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("/auth/login", { userId, password });
      
      if (!res.data.user.isSuperAdmin) {
        setError("Access denied. Super admin privileges required.");
        return;
      }
      
      sessionStorage.setItem("jwt-token", res.data.token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate("/superadmin/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
    }}>
      <div style={{
        background: '#fff',
        padding: '48px 32px 32px 32px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(220, 38, 38, 0.3)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          background: '#dc2626',
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
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
          border: '4px solid #fff'
        }}>
          <FaShieldAlt size={40} />
        </div>
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#dc2626',
          marginBottom: '8px',
          marginTop: '16px'
        }}>Super Admin</h1>
        
        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '32px'
        }}>Restricted Access Only</p>
        
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="Super Admin ID"
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
            onFocus={(e) => e.target.style.borderColor = '#dc2626'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <input
            type="password"
            placeholder="Password"
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
            onFocus={(e) => e.target.style.borderColor = '#dc2626'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            type="submit"
            style={{
              background: '#dc2626',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            Access System
          </button>
        </form>

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
          <Link to="/login" style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '600'
          }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;