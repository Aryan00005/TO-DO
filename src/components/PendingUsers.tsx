import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa';

interface PendingUsersProps {
  user: any;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const PendingUsers: React.FC<PendingUsersProps> = ({ user, onSuccess, onError }) => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'admin') {
      fetchPendingUsers();
    }
  }, [user]);

  const fetchPendingUsers = async () => {
    try {
      const token = sessionStorage.getItem('jwt-token');
      const res = await axios.get('/auth/admin/pending-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
    } catch (err) {
      console.error('Error fetching pending users:', err);
    }
  };

  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('jwt-token');
      await axios.post('/auth/admin/user-action', {
        userId,
        action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onSuccess(`User ${action}d successfully!`);
      fetchPendingUsers();
    } catch (err: any) {
      onError(err.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'admin' || pendingUsers.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <FaClock style={{ color: '#f59e0b' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Pending User Approvals ({pendingUsers.length})
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pendingUsers.map((pendingUser) => (
          <div
            key={pendingUser.id}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {pendingUser.name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {pendingUser.email} • {pendingUser.user_id}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Requested: {new Date(pendingUser.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleUserAction(pendingUser.id, 'approve')}
                disabled={loading}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <FaCheck size={12} /> Approve
              </button>
              <button
                onClick={() => handleUserAction(pendingUser.id, 'reject')}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <FaTimes size={12} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingUsers;
