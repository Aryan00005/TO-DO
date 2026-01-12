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
    
    // Populate assignedTo and assignedBy user details
    const populatedTasks = await Promise.all(tasks.map(async (task) => {
      const assignedByUser = await User.findById(task.assigned_by);
      const assigneeDetails = await Promise.all(
        task.assigneeStatuses.map(async (status) => {
          const user = await User.findById(status.user);
          return {
            ...status,
            user: user ? { _id: user.id, name: user.name, email: user.email } : status.user
          };
        })
      );
      
      return {
        ...task,
        assignedBy: assignedByUser ? { _id: assignedByUser.id, name: assignedByUser.name, email: assignedByUser.email } : task.assigned_by,
        assigneeStatuses: assigneeDetails
      };
    }));
    
    res.json(populatedTasks);
  } catch (err) {
    console.error('Error fetching assigned tasks:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get tasks assigned by user (show tasks created by current user)
router.get('/assignedBy/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.findAssignedByUser(req.params.userId);
    
    // Populate user details
    const populatedTasks = await Promise.all(tasks.map(async (task) => {
      const assignedByUser = await User.findById(task.assigned_by);
      const assigneeDetails = await Promise.all(
        task.assigneeStatuses.map(async (status) => {
          const user = await User.findById(status.user);
          return {
            ...status,
            user: user ? { _id: user.id, name: user.name, email: user.email } : status.user
          };
        })
      );
      
      return {
        ...task,
        assignedBy: assignedByUser ? { _id: assignedByUser.id, name: assignedByUser.name, email: assignedByUser.email } : task.assigned_by,
        assigneeStatuses: assigneeDetails
      };
    }));
    
    res.json(populatedTasks);
  } catch (err) {
    console.error('Error fetching tasks created by user:', err);
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

// Update entire task (Admin only)
router.put('/:taskId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only company admins can edit tasks.' });
    }

    const { title, description, assignedTo, priority, dueDate, company } = req.body;
    
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    // Update task using Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        priority,
        due_date: dueDate,
        company: company || currentUser.company
      })
      .eq('id', req.params.taskId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update task assignments
    await supabase.from('task_assignments').delete().eq('task_id', req.params.taskId);
    
    const assignments = assigneeArray.map(userId => ({
      task_id: parseInt(req.params.taskId),
      user_id: parseInt(userId),
      status: 'Not Started'
    }));
    
    await supabase.from('task_assignments').insert(assignments);
    
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Delete task (Admin only)
router.delete('/:taskId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only company admins can delete tasks.' });
    }

    await Task.deleteById(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
