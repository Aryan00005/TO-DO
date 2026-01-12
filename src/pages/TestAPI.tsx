import React, { useState } from 'react';
import axios from '../api/axios';

const TestAPI: React.FC = () => {
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    try {
      setResult('Testing...');
      const response = await axios.get('/auth/test');
      setResult(`Success: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setResult(`Error: ${error.message} - ${error.response?.data?.message || 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={testConnection}>Test API Connection</button>
      <div style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0' }}>
        {result}
      </div>
    </div>
  );
};

export default TestAPI;