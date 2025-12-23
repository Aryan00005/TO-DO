import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface AuthCallbackProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ setUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const setupCredentials = searchParams.get('setupCredentials');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      try {
        // Store token
        sessionStorage.setItem('jwt-token', token);
        
        // Decode user info from token (basic decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Fetch full user data
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api'}/auth/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(users => {
          // Find current user from users list
          const currentUser = users.find((u: any) => u._id === payload.id);
          if (currentUser) {
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            setUser(currentUser);
          }
          
          // Redirect based on setup requirement
          if (setupCredentials === 'true') {
            navigate('/setup-credentials?welcome=true');
          } else {
            navigate('/dashboard');
          }
        })
        .catch(err => {
          console.error('Failed to fetch user data:', err);
          navigate('/dashboard'); // Navigate anyway, user data will be fetched later
        });
      } catch (err) {
        console.error('Token processing error:', err);
        navigate('/login?error=token_invalid');
      }
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '32px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Completing login...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthCallback;