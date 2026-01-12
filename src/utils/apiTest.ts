import axios from '../api/axios';

export const testApiConnection = async () => {
  try {
    console.log('Testing API connection to:', axios.defaults.baseURL);
    const response = await axios.get('/auth/test');
    console.log('API test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('API test failed:', error);
    return { success: false, error };
  }
};

export const testHealthCheck = async () => {
  try {
    const baseURL = axios.defaults.baseURL?.replace('/api', '') || 'https://to-do-m0we.onrender.com';
    console.log('Testing health check at:', `${baseURL}/health`);
    const response = await fetch(`${baseURL}/health`);
    const data = await response.json();
    console.log('Health check successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Health check failed:', error);
    return { success: false, error };
  }
};