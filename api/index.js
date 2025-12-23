module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple test endpoint
  if (req.url === '/api' || req.url === '/api/') {
    return res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  // Auth test endpoint
  if (req.url === '/api/auth/test') {
    return res.json({ message: 'Auth routes working' });
  }

  // Login endpoint
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    const { userId, password } = req.body || {};
    
    // Simple test login
    if (userId === 'testuser' && password === 'password123') {
      return res.json({ 
        token: 'test-token-123',
        user: { _id: '1', name: 'Test User', userId: 'testuser', email: 'test@example.com' }
      });
    }
    
    return res.status(400).json({ message: 'Invalid credentials.' });
  }

  // Default 404
  res.status(404).json({ message: 'Endpoint not found' });
};