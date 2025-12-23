import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SetCredentials: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const token = sessionStorage.getItem('jwt-token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api'}/auth/set-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Update user data in session storage
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        currentUser.userId = userId;
        currentUser.authProvider = 'hybrid';
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        
        navigate('/dashboard?credentialsSet=true');
      } else {
        setError(data.message || 'Failed to set credentials');
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
      background: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '450px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#1f2937', marginBottom: '8px' }}>
            {isWelcome ? '🎉 Welcome!' : 'Create Your Credentials'}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {isWelcome 
              ? 'Create your User ID and Password to complete account setup'
              : 'Set up your login credentials'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Create User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your unique User ID"
              required
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              This will be used for login (minimum 3 characters)
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginBottom: '20px'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Credentials'}
          </button>
        </form>

        <div style={{
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>After creating credentials, you can login using:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Google (recommended)</li>
            <li>Your User ID + Password</li>
            <li>Your Email + Password</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SetCredentials;