require('dotenv').config();

module.exports = {
  baseURL: process.env.BACKEND_URL || 'http://localhost:5500',
  testUser: {
    email: 'test@example.com',
    password: 'Test@123456',
    name: 'Test User'
  },
  testAdmin: {
    email: 'admin@example.com',
    password: 'Admin@123456',
    name: 'Test Admin'
  },
  testSuperAdmin: {
    email: 'superadmin@taskmanager.com',
    password: 'SuperAdmin@123'
  }
};
