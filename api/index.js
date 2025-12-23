const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('../routes/auth');
const taskRoutes = require('../routes/task');
const notificationRoutes = require('../routes/notification');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://office-tasks-git-main-vrund-patels-projects-881710aa.vercel.app',
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = app;