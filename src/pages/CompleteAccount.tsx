import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface CompleteAccountProps {
  setUser?: React.Dispatch<React.SetStateAction<any>>;
}

const CompleteAccount: React.FC<CompleteAccountProps> = ({ setUser }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing token. Please try logging in again.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (userId.length < 3) {
      setError('User ID must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api'}/auth/complete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, userId, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store login session
        sessionStorage.setItem('jwt-token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        // Update parent component state
        if (setUser) {
          setUser(data.user);
        }
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to complete account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '450px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px'
          }}>
            🔐
          </div>
          <h2 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '24px' }}>
            Complete Your Account
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Create your login credentials to finish registration
          </p>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          ⚠️ <strong>Required:</strong> You must complete this step to access your account
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Create User ID *
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Choose a unique User ID"
              required
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Minimum 3 characters (letters, numbers, underscore)
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Create Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter a strong password"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Re-enter your password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>After completion, you can login using:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Google (one-click login)</li>
            <li>Your User ID + Password</li>
            <li>Your Email + Password</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompleteAccount;