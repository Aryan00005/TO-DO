// Test backend connectivity
// Run this in browser console:

fetch('https://to-do-m0we.onrender.com/health')
  .then(res => res.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Backend error:', err));

// Test auth endpoint
fetch('https://to-do-m0we.onrender.com/api/auth/test')
  .then(res => res.json())
  .then(data => console.log('Auth test:', data))
  .catch(err => console.error('Auth error:', err));