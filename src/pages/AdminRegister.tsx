import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { useToast } from '../components/Toast';

const AdminRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a Google user from role selection
    const googleParam = searchParams.get('google');
    const googleToken = sessionStorage.getItem('google-auth-token');
    
    if (googleParam === 'true' && googleToken) {
      setIsGoogleUser(true);
      // Pre-fill email from Google token if available
      try {
        const payload = JSON.parse(atob(googleToken.split('.')[1]));
        if (payload.email) {
          setFormData(prev => ({ ...prev, email: payload.email }));
        }
        if (payload.name) {
          setFormData(prev => ({ ...prev, name: payload.name }));
        }
      } catch (err) {
        console.error('Error parsing Google token:', err);
      }
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isGoogleUser) {
        // For Google users, call the new Google admin registration endpoint
        const googleToken = sessionStorage.getItem('google-auth-token');
        await axios.post('/auth/google-admin-register', {
          token: googleToken,
          name: formData.name,
          userId: formData.userId,
          email: formData.email,
          password: formData.password,
          company: formData.company
        });
        
        // Clear Google session data
        sessionStorage.removeItem('google-auth-token');
        sessionStorage.removeItem('selected-role');
        
        showToast('Admin account created! Awaiting super admin approval.', 'success');
        setTimeout(() => navigate('/pending-approval'), 2000);
      } else {
        // Regular admin registration
        await axios.post('/auth/admin/register', {
          name: formData.name,
          userId: formData.userId,
          email: formData.email,
          password: formData.password,
          company: formData.company
        });
        
        showToast('Company admin registered successfully!', 'success');
        setTimeout(() => navigate('/admin/login'), 2000);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
            {isGoogleUser ? 'Complete Admin Registration' : 'Company Admin Registration'}
          </h1>
          <p style={{ color: '#6b7280' }}>
            {isGoogleUser ? 'Complete your admin account setup' : 'Create your company admin account'}
          </p>
          {isGoogleUser && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              ✓ Signed in with Google - Complete your admin registration below
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              User ID
            </label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Company Name
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Already have an admin account?{' '}
            <Link to="/admin/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
              Sign in here
            </Link>
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            Regular user?{' '}
            <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
              User Login
            </Link>
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AdminRegister;