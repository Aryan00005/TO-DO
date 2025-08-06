const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/task.js');
const User = require('../models/user.js');
const Notification = require('../models/notification.js');
const auth = require('../middleware/auth');
const { canAssignTask, ROLES } = require('../utils/roleUtils');

// Create a task (supports dueDate and company)
router.post('/', auth, async (req, res) => {
  let { title, description, assignedTo, priority, dueDate, company } = req.body;
  console.log('Raw req.body:', req.body);
  console.log('RAW assignedTo:', assignedTo, 'Type:', typeof assignedTo, 'IsArray:', Array.isArray(assignedTo));
if (Array.isArray(assignedTo)) {
  assignedTo.forEach((id, idx) => {
    console.log(`assignedTo[${idx}]:`, id, 'Type:', typeof id);
  });
}


  try {
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    // If assignedTo is a string, try to parse it as JSON
    if (typeof assignedTo === 'string') {
      try {
        assignedTo = JSON.parse(assignedTo);
        console.log('Parsed assignedTo:', assignedTo, 'isArray:', Array.isArray(assignedTo));
      } catch (e) {
        return res.status(400).json({ message: 'assignedTo is not a valid array' });
      }
    }

    if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
      return res.status(400).json({ message: 'At least one assignee is required' });
    }

    // Robust ObjectId validation
    const { ObjectId } = mongoose.Types;
    const trimmedAssignedTo = assignedTo.map(id => typeof id === 'string' ? id.trim() : '');
trimmedAssignedTo.forEach(id => {
  console.log(
    'ID:', id,
    'Type:', typeof id,
    'Regex:', /^[0-9a-fA-F]{24}$/.test(id)
  );
});

for (const userId of trimmedAssignedTo) {
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    console.error('Invalid userId:', userId);
    return res.status(400).json({ message: `Invalid user ID format: ${userId}` });
  }
}

    // Optional: Debug each ID
    trimmedAssignedTo.forEach(id => {
      console.log(
        'ID:', id,
        'Type:', typeof id,
        'Regex:', /^[0-9a-fA-F]{24}$/.test(id),
        'isValid:', ObjectId.isValid(id),
        'toHexString:', new ObjectId(id).toHexString()
      );
    });

    // Check if all users exist
    const usersExist = await User.countDocuments({ _id: { $in: trimmedAssignedTo } });
    console.log(`User IDs provided: ${trimmedAssignedTo.length}, users found in DB: ${usersExist}`);
    if (usersExist !== trimmedAssignedTo.length) {
      return res.status(400).json({ message: 'One or more users do not exist' });
    }

    // Validate priority (default to 3 if invalid)
    priority = Number(priority);
    if (isNaN(priority) || priority < 1 || priority > 5) {
      priority = 3;
    }

    // Validate dueDate
    const dueDateObj = dueDate ? new Date(dueDate) : undefined;
    if (dueDate && isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid dueDate format' });
    }

    const task = new Task({
      title,
      description,
      assignedBy: req.user._id,
      assignedTo: trimmedAssignedTo,
      priority,
      dueDate: dueDateObj,
      company
    });
    await task.save();
    
    // Create notifications for assigned users
    const assignerUser = await User.findById(req.user._id);
    const assignerName = assignerUser ? assignerUser.name : 'Someone';
    
    for (const userId of trimmedAssignedTo) {
      await Notification.create({
        user: userId,
        message: `New task "${title}" has been assigned to you by ${assignerName}` +
          (dueDateObj ? ` (Due: ${dueDateObj.toLocaleDateString()})` : '')
      });
    }
    
    res.status(201).json({ message: 'Task created and assigned!', task });
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get all tasks assigned to a user, sorted by priority (highest first)
router.get('/assignedTo/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const userIdObj = new mongoose.Types.ObjectId(req.params.userId);
    const tasks = await Task.find({ assignedTo: userIdObj })
      .populate('assignedBy', 'name email')
      .sort({ priority: -1 }); // Sort by priority DESC (highest first)
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get all tasks created by a user
router.get('/assignedBy/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const tasks = await Task.find({ assignedBy: req.params.userId })
      .populate('assignedTo', 'name email');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Edit task (for assigner)
router.patch('/:taskId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const { status, remark } = req.body;
    const userId = req.user._id; // Auth middleware sets req.user

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is an assignee
    if (!task.assignedTo.map(id => String(id)).includes(String(userId))) {
      return res.status(403).json({ message: 'Only an assignee can update their status.' });
    }

    const validStatuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    // Find or create the assignee status entry
    let assigneeStatus = task.assigneeStatuses.find(s => String(s.user) === String(userId));
    if (!assigneeStatus) {
      assigneeStatus = {
        user: userId,
        status: status || 'Not Started',
        completionRemark: remark || '',
        updatedAt: new Date()
      };
      task.assigneeStatuses.push(assigneeStatus);
    } else {
      if (status) assigneeStatus.status = status;
      if (typeof remark === 'string') assigneeStatus.completionRemark = remark;
      assigneeStatus.updatedAt = new Date();
    }

    task.updatedAt = new Date();
    await task.save();

    // Notify assigner if the task is marked as "Done" by this user
    if (status === 'Done') {
      const assigneeUser = await User.findById(userId);
      await Notification.create({
        user: task.assignedBy,
        message: `Task "${task.title}" assigned to ${assigneeUser ? assigneeUser.name : userId} has been completed by them!` +
          (remark ? ` Remark: ${remark}` : "")
      });
    }

    res.json({ message: 'User task status updated', task });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// PATCH /tasks/:taskId - Update a task (only assigner can edit)
router.patch('/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (String(task.assignedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigner can edit this task.' });
    }
    const allowedFields = ['title', 'description', 'assignedTo', 'priority', 'dueDate', 'company'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });
    task.updatedAt = Date.now();
    await task.save();
    res.json({ message: 'Task updated', task });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Delete task (only assigner can delete)
router.delete('/:taskId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (String(task.assignedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigner can delete this task.' });
    }
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
