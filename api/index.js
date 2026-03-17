module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse request body for POST requests
  let body = {};
  if (req.method === 'POST' && req.body) {
    body = req.body;
  }

  const url = req.url || '';
  const method = req.method || 'GET';

  console.log('API Request:', method, url, body);

  // Route handling
  if (url === '/api' || url === '/api/') {
    return res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
  }

  if (url === '/api/auth/test' || url.endsWith('/auth/test')) {
    return res.json({ message: 'Auth routes working' });
  }

  if ((url === '/api/auth/login' || url.endsWith('/auth/login')) && method === 'POST') {
    const { userId, password } = body;
    
    console.log('Login attempt:', { userId, password });
    
    // Test login
    if (userId === 'testuser' && password === 'password123') {
      return res.json({ 
        token: 'test-token-123',
        user: { 
          _id: '1', 
          name: 'Test User', 
          userId: 'testuser', 
          email: 'test@example.com',
          authProvider: 'local'
        }
      });
    }
    
    return res.status(400).json({ message: 'Invalid credentials.' });
  }

  // Default response
  console.log('No route matched for:', method, url);
  res.status(404).json({ 
    message: 'Endpoint not found', 
    url: url,
    method: method,
    availableEndpoints: ['/api', '/api/auth/test', '/api/auth/login']
  });
};