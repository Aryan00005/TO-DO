import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { FaUserPlus } from 'react-icons/fa';

interface CompleteAccountProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const CompleteAccount: React.FC<CompleteAccountProps> = ({ setUser }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/auth/complete-account', {
        token,
        userId,
        password
      });

      sessionStorage.setItem('jwt-token', res.data.token);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete account');
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
      background: 'linear-gradient(120deg, #f5f7fa 0%, #e0e7ef 100%)'
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
          <FaUserPlus size={40} />
        </div>
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '16px',
          marginTop: '16px'
        }}>Complete Your Account</h1>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '14px'
        }}>
          Please create a User ID and password to complete your Google account setup.
        </p>
        
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="Choose a User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            required
            minLength={3}
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
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
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
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Completing...' : 'Complete Account'}
          </button>
        </form>

        {error && (
          <p style={{
            color: '#ef4444',
            marginTop: '16px',
            fontSize: '14px'
          }}>{error}</p>
        )}
      </div>
    </div>
  );
};

export default CompleteAccount;