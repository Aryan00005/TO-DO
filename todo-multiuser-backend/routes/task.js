const express = require('express');
const router = express.Router();
const Task = require('../models/task.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Create a task
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 Creating task with request:', req.body);
    console.log('👤 User creating task:', req.user.id);
    
    const { title, description, assignedTo, priority = 3, dueDate, company } = req.body;
    
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    console.log('👥 Assignees:', assigneeArray);
    
    // Check if creator is admin
    const creator = await User.findById(req.user.id);
    const createdByAdmin = creator && creator.role === 'admin';
    
    console.log('👤 Creator details:', { id: creator?.id, role: creator?.role, company: creator?.company });
    
    const task = await Task.create({
      title,
      description,
      assignedBy: req.user.id,
      assignedTo: assigneeArray,
      priority,
      dueDate,
      company,
      createdByAdmin
    });
    
    console.log('✅ Task created successfully:', task.id);
    
    // Return task with proper ID mapping
    const responseTask = {
      ...task,
      _id: task.id.toString(),
      dueDate: task.due_date
    };
    
    res.status(201).json({ message: 'Task created!', task: responseTask });
  } catch (err) {
    console.error('❌ Task creation error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get all visible tasks for user
router.get('/visible', auth, async (req, res) => {
  try {
    console.log('🔍 /tasks/visible called for user:', req.user.id);
    
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('👤 Current user:', { id: currentUser.id, role: currentUser.role, company: currentUser.company });

    const tasks = await Task.findVisibleToUser(currentUser.id, currentUser.role, currentUser.company);
    
    console.log('📋 Tasks returned:', tasks.length);
    res.json(tasks);
  } catch (err) {
    console.error('❌ Error fetching visible tasks:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get tasks assigned to user
router.get('/assignedTo/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.findAssignedToUser(req.params.userId);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching assigned tasks:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get tasks assigned by user (show tasks created by current user)
router.get('/assignedBy/:userId', auth, async (req, res) => {
  try {
    const tasks = await Task.findAssignedByUser(req.params.userId);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks created by user:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Update task status
router.patch('/:taskId', auth, async (req, res) => {
  try {
    const { status, remark, title, description, assignedTo, priority, dueDate, company } = req.body;
    console.log('Updating task:', req.params.taskId, 'with data:', req.body);
    
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user can update this task
    const canUpdate = await Task.canUserUpdateTask(req.params.taskId, currentUser.id, currentUser.role);
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied. You cannot update this task.' });
    }
    
    // If it's a status update, validate progression
    if (status && !title) {
      // Get current task status
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { data: currentTask, error: fetchError } = await supabase
        .from('task_assignments')
        .select('status')
        .eq('task_id', req.params.taskId)
        .eq('user_id', currentUser.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current task status:', fetchError);
        return res.status(500).json({ message: 'Error fetching task status' });
      }
      
      const currentStatus = currentTask.status;
      
      // Define status progression rules (one-way only)
      const statusProgression = {
        'Not Started': ['Working on it'],
        'Working on it': ['Stuck', 'Done'],
        'Stuck': ['Working on it', 'Done'],
        'Done': [] // Cannot move from Done
      };
      
      // Validate status progression
      if (!statusProgression[currentStatus] || !statusProgression[currentStatus].includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status transition. Cannot move from '${currentStatus}' to '${status}'. Tasks can only move forward in the workflow.`,
          currentStatus,
          allowedStatuses: statusProgression[currentStatus] || []
        });
      }
      
      const result = await Task.updateTaskStatus(req.params.taskId, status, remark);
      return res.json({ message: 'Task status updated', result });
    }
    
    // If it's a full task update (admin only)
    if (title && description) {
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Only admins can edit task details.' });
      }
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Update task details
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          priority: priority || 3,
          due_date: dueDate,
          company
        })
        .eq('id', req.params.taskId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update assignments if provided
      if (assignedTo) {
        const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
        
        // Delete existing assignments
        await supabase.from('task_assignments').delete().eq('task_id', req.params.taskId);
        
        // Create new assignments
        const assignments = assigneeArray.map(userId => ({
          task_id: parseInt(req.params.taskId),
          user_id: parseInt(userId)
        }));
        
        await supabase.from('task_assignments').insert(assignments);
      }
      
      return res.json({ message: 'Task updated successfully', task: updatedTask });
    }
    
    res.status(400).json({ message: 'Invalid update data' });
  } catch (err) {
    console.error('Error updating task:', err);
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

// Get pending task approvals (Admin only)
router.get('/pending-approvals', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view pending approvals.' });
    }

    const pendingTasks = await Task.getPendingApprovals(currentUser.id);
    res.json(pendingTasks);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Approve task (Admin only)
router.post('/:taskId/approve', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can approve tasks.' });
    }

    const task = await Task.approveTask(req.params.taskId, currentUser.id);
    res.json({ message: 'Task approved successfully', task });
  } catch (err) {
    console.error('Error approving task:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Reject task (Admin only)
router.post('/:taskId/reject', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can reject tasks.' });
    }

    const task = await Task.rejectTask(req.params.taskId, currentUser.id);
    res.json({ message: 'Task rejected successfully', task });
  } catch (err) {
    console.error('Error rejecting task:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Check if user can update task
router.get('/:taskId/can-update', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const canUpdate = await Task.canUserUpdateTask(req.params.taskId, currentUser.id, currentUser.role);
    res.json({ canUpdate });
  } catch (err) {
    console.error('Error checking update permission:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
