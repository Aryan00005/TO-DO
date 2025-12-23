const express = require('express');
const Task = require('../models/task.js'); // Use lowercase
const User = require('../models/user.js');

const router = express.Router();

// Middleware to check if user is superadmin
const isSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Get all users and their tasks (superadmin only)
router.get('/users-tasks', isSuperadmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const tasks = await Task.find();
    res.json({ users, tasks });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
