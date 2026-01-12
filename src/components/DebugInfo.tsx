import React from 'react';

const DebugInfo: React.FC = () => {
  const token = sessionStorage.getItem('jwt-token');
  const userStr = sessionStorage.getItem('user');
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#fff',
      border: '1px solid #ccc',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Debug Info:</strong></div>
      <div>Token: {token ? 'Present' : 'Missing'}</div>
      <div>User: {userStr ? 'Present' : 'Missing'}</div>
      {userStr && (
        <div>User Data: {JSON.stringify(JSON.parse(userStr), null, 2)}</div>
      )}
    </div>
  );
};

export default DebugInfo;