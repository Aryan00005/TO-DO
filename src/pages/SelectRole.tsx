import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaUser, FaUserTie } from 'react-icons/fa';

const SelectRole: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleRoleSubmit = async () => {
    if (!selectedRole || !token) {
      setError('Please select a role and ensure you have a valid token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Store the Google user token and role in sessionStorage for registration forms
      sessionStorage.setItem('google-auth-token', token);
      sessionStorage.setItem('selected-role', selectedRole);
      
      // Redirect to appropriate registration form
      if (selectedRole === 'admin') {
        navigate('/admin/register?google=true');
      } else {
        navigate('/register?google=true');
      }
    } catch (err) {
      setError('Error processing role selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Invalid or missing token. Please try logging in again.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

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
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#1f2937', marginBottom: '16px', fontSize: '28px' }}>
          Choose Your Role
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '32px' }}>
          Select how you want to use this platform
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div
            onClick={() => setSelectedRole('user')}
            style={{
              flex: 1,
              padding: '24px',
              border: selectedRole === 'user' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              background: selectedRole === 'user' ? '#f0f9ff' : '#fff',
              transition: 'all 0.2s'
            }}
          >
            <FaUser size={32} style={{ color: '#3b82f6', marginBottom: '12px' }} />
            <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>User</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Create and manage your own tasks
            </p>
          </div>

          <div
            onClick={() => setSelectedRole('admin')}
            style={{
              flex: 1,
              padding: '24px',
              border: selectedRole === 'admin' ? '3px solid #10b981' : '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              background: selectedRole === 'admin' ? '#f0fdf4' : '#fff',
              transition: 'all 0.2s'
            }}
          >
            <FaUserTie size={32} style={{ color: '#10b981', marginBottom: '12px' }} />
            <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Admin</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Manage company users and tasks
            </p>
          </div>
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
          onClick={handleRoleSubmit}
          disabled={!selectedRole || loading}
          style={{
            width: '100%',
            background: !selectedRole || loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !selectedRole || loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>Note:</strong> Your account will be pending approval until approved by an admin.
        </div>
      </div>
    </div>
  );
};

export default SelectRole;