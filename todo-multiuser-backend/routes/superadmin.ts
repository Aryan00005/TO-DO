import express from 'express';
import Task from '../models/Task'; // Adjust path as needed
import User from '../models/user';
const router = express.Router();

// Middleware to check if user is superadmin
const isSuperadmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'superadmin') {
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

export default router;
