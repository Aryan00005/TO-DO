const express = require('express');
const router = express.Router();
const Task = require('../models/task.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Create a task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, assignedTo, priority = 3, dueDate, company } = req.body;
    
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    const task = await Task.create({
      title,
      description,
      assignedBy: req.user.id,
      assignedTo: assigneeArray,
      priority,
      dueDate,
      company
    });
    
    res.status(201).json({ message: 'Task created!', task });
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get tasks assigned to user
router.get('/assignedTo/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.findAssignedToUser(req.params.userId);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get tasks assigned by user
router.get('/assignedBy/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.findAssignedByUser(req.params.userId);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Update task status
router.patch('/:taskId', auth, async (req, res) => {
  try {
    const { status, remark } = req.body;
    const result = await Task.updateUserStatus(req.params.taskId, req.user.id, status, remark);
    res.json({ message: 'Task status updated', result });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Update entire task
router.put('/:taskId', auth, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, company } = req.body;
    
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        title,
        description,
        assignedTo: assigneeArray,
        priority,
        dueDate,
        company
      },
      { new: true }
    ).populate('assignedTo', 'name email')
     .populate('assignedBy', 'name email');
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Delete task
router.delete('/:taskId', auth, async (req, res) => {
  try {
    await Task.deleteById(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
