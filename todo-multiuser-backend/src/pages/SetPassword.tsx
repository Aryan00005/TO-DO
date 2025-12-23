import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    // Fetch user profile to show User ID
    const fetchUserInfo = async () => {
      try {
        const token = sessionStorage.getItem('jwt-token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api'}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };
    
    fetchUserInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem('jwt-token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api'}/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/dashboard?passwordSet=true');
      } else {
        setError(data.message || 'Failed to set password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
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
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#1f2937', marginBottom: '8px' }}>
            {isWelcome ? '🎉 Welcome!' : 'Set Password'}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {isWelcome 
              ? 'Set up a password to enable email/password login (optional)'
              : 'Add password login to your Google account'
            }
          </p>
          
          {userInfo && (
            <div style={{
              background: '#f0f9ff',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '16px',
              fontSize: '13px'
            }}>
              <div style={{ color: '#0369a1', fontWeight: '500' }}>Your Login Credentials:</div>
              <div style={{ color: '#0c4a6e', marginTop: '4px' }}>
                <strong>User ID:</strong> {userInfo.userId}
              </div>
              <div style={{ color: '#0c4a6e' }}>
                <strong>Email:</strong> {userInfo.email}
              </div>
            </div>
          )}
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
              New Password
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                background: '#3b82f6',
                color: 'white',
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Setting...' : 'Set Password'}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              style={{
                flex: 1,
                background: 'transparent',
                color: '#6b7280',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Skip for Now
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>After setting a password, you can login using:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Google (recommended)</li>
            <li><strong>Email:</strong> {userInfo?.email}</li>
            <li><strong>User ID:</strong> {userInfo?.userId}</li>
          </ul>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#0c4a6e' }}>
            📝 Save your User ID: <strong>{userInfo?.userId}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;