const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Get notifications for a user (sorted newest first, show name in message if possible)
router.get('/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.findByUserId(req.params.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a single notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.notificationId);
    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark ALL notifications as read for a user
router.patch('/all/:userId/read', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.params.userId);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get pending task approvals from notifications (Admin only)
router.get('/pending-approvals/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view pending approvals.' });
    }

    // Get notifications that contain "approval required"
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.userId)
      .ilike('message', '%approval required%')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Extract task information from notification messages and get full task details
    const taskApprovals = [];
    for (const notification of notifications || []) {
      // Extract task title from message like "Task approval required: "Task Title" assigned by User"
      const match = notification.message.match(/Task approval required: "([^"]+)" assigned by (.+)/);
      if (match) {
        const [, taskTitle, assignedBy] = match;
        
        // Find the actual task
        const { data: task } = await supabase
          .from('tasks')
          .select(`
            *,
            task_assignments(
              user_id,
              users(id, name, email)
            )
          `)
          .eq('title', taskTitle)
          .eq('approval_status', 'pending')
          .eq('company', currentUser.company)
          .single();
        
        if (task) {
          taskApprovals.push({
            ...task,
            _id: task.id.toString(),
            dueDate: task.due_date,
            notificationId: notification.id,
            assignedByName: assignedBy
          });
        }
      }
    }
    
    res.json(taskApprovals);
  } catch (err) {
    console.error('Error fetching pending approvals from notifications:', err);
    res.status(500).json({ message: err.message });
  }
});

// Approve task from notification
router.post('/approve-task/:notificationId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can approve tasks.' });
    }

    const { taskId } = req.body;
    console.log('Approving task from notification:', { notificationId: req.params.notificationId, taskId, userId: req.user.id });
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    // Approve the task
    const Task = require('../models/task');
    const task = await Task.approveTask(taskId, currentUser.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found or already processed' });
    }
    
    // Mark notification as read
    await Notification.markAsRead(req.params.notificationId);
    
    // Create notifications for assigned users
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId);
    
    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        try {
          await Notification.create(assignment.user_id, `Task approved: "${task.title}"`);
        } catch (notifError) {
          console.error('Notification creation failed:', notifError);
        }
      }
    }
    
    res.json({ message: 'Task approved successfully', task });
  } catch (err) {
    console.error('Error approving task from notification:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Reject task from notification
router.post('/reject-task/:notificationId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can reject tasks.' });
    }

    const { taskId } = req.body;
    console.log('Rejecting task from notification:', { notificationId: req.params.notificationId, taskId, userId: req.user.id });
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    // Reject the task
    const Task = require('../models/task');
    const task = await Task.rejectTask(taskId, currentUser.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found or already processed' });
    }
    
    // Mark notification as read
    await Notification.markAsRead(req.params.notificationId);
    
    // Notify task creator about rejection
    try {
      await Notification.create(task.assigned_by, `Task rejected: "${task.title}"`);
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }
    
    res.json({ message: 'Task rejected successfully', task });
  } catch (err) {
    console.error('Error rejecting task from notification:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
