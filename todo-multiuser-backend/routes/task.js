const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/task');
const User = require('../models/user');
const Notification = require('../models/notification');
const auth = require('../middleware/auth');
const { canAssignTask, ROLES } = require('../utils/roleUtils');

// Create a task (now supports dueDate and company)
router.post('/', auth, async (req, res) => {
  // Add company to destructuring
  const { title, description, assignedTo, priority, dueDate, company } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignee are required' });
    }

    // Validate assignedTo is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Verify assignedTo user exists
    const assigneeExists = await User.exists({ _id: assignedTo });
    if (!assigneeExists) {
      return res.status(400).json({ message: 'Assignee user does not exist' });
    }

    // Create task with authenticated user as assigner, include priority, dueDate, and company
    const task = new Task({
      title,
      description,
      assignedBy: req.user._id,
      assignedTo,
      priority: priority || 3, // Default to 3 if not provided
      dueDate: dueDate ? new Date(dueDate) : undefined, // Save dueDate if provided
      company // <-- Added company field
    });

    await task.save();
    res.status(201).json({ message: 'Task created and assigned!', task });

  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get all tasks assigned to a user
router.get('/assignedTo/:userId', auth, async (req, res) => {
  try {
    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const userIdObj = new mongoose.Types.ObjectId(req.params.userId);

    // Use ObjectId for the query
    const tasks = await Task.find({ assignedTo: userIdObj })
      .populate('assignedBy', 'name email');

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

// Update task status (only assignee can update, supports completion remark)
router.patch('/:taskId/status', auth, async (req, res) => {
  try {
    // Validate task ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
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
    // Only the assigner can edit
    if (String(task.assignedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigner can edit this task.' });
    }

    // Update allowed fields
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


    // Find the task
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only the assignee can update the status (compare as strings)
    if (String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assignee can update the status.' });
    }

    // Allow only valid statuses
    const validStatuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const prevStatus = task.status;
    if (req.body.status) {
      task.status = req.body.status;
    }
    task.updatedAt = Date.now();

    // Save completion remark if provided
    if (typeof req.body.remark === 'string') {
      task.completionRemark = req.body.remark;
    }

    await task.save();

    // Notify assigner if the task is marked as "Done"
    if (prevStatus !== 'Done' && task.status === 'Done') {
      // Find assignee's name
      const assigneeUser = await User.findById(task.assignedTo);

      await Notification.create({
        user: task.assignedBy,
        message: `Task "${task.title}" assigned to ${assigneeUser ? assigneeUser.name : task.assignedTo} has been completed!` +
          (task.completionRemark ? ` Remark: ${task.completionRemark}` : "")
      });
    }

    res.json({ message: 'Task status updated', task });
  } catch (err) {
    console.error('Error updating task status:', err);
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

    // Only the assigner can delete the task
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
