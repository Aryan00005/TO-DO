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
    
    const creator = await User.findById(req.user.id);
    const createdByAdmin = creator && creator.role === 'admin';
    
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

// Debug endpoint - get ALL tasks (remove after debugging)
router.get('/debug-all', auth, async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(
          user_id,
          users(id, name, email, role, account_status)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('DEBUG - All tasks in database:', allTasks.length);
    allTasks.forEach(task => {
      console.log(`Task ${task.id}: ${task.title} | Company: ${task.company} | Approval: ${task.approval_status} | Assigned by: ${task.assigned_by}`);
    });
    
    res.json(allTasks);
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all visible tasks for user
router.get('/visible', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tasks = await Task.findVisibleToUser(currentUser.id, currentUser.role, currentUser.company);
    
    res.json(tasks);
  } catch (err) {
    console.error('❌ Error fetching visible tasks:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get pending task approvals (Admin only) - BEFORE /:taskId routes
router.get('/pending-approvals', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view pending approvals.' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get tasks assigned to this admin that are pending
    const { data: pendingTasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments!inner(
          user_id
        )
      `)
      .eq('approval_status', 'pending')
      .eq('task_assignments.user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Populate task details
    const populatedTasks = await Promise.all((pendingTasks || []).map(async (task) => {
      const { data: creator } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', task.assigned_by)
        .single();
      
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(`
          user_id,
          users(id, name, email)
        `)
        .eq('task_id', task.id);
      
      const assignees = assignments?.map(a => a.users) || [];
      
      return {
        ...task,
        _id: task.id.toString(),
        dueDate: task.due_date,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    }));
    
    res.json(populatedTasks);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
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

// Get tasks assigned to user only (including self-assigned tasks)
router.get('/assignedToOnly/:userId', auth, async (req, res) => {
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
    const currentUser = await User.findById(req.user.id);
    const tasks = await Task.findAssignedByUser(req.params.userId, currentUser?.company);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks created by user:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get all tasks for a specific user (for admin user management)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view user tasks.' });
    }

    const assignedToTasks = await Task.findAssignedToUser(req.params.userId);
    const assignedByTasks = await Task.findAssignedByUser(req.params.userId);
    const allTasks = [...assignedToTasks, ...assignedByTasks];
    const uniqueTasks = allTasks.filter((task, index, self) =>
      index === self.findIndex(t => t._id === task._id)
    );

    res.json(uniqueTasks);
  } catch (err) {
    console.error('Error fetching user tasks:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get single task details (for editing)
router.get('/:taskId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(
          user_id,
          users(id, name, email)
        )
      `)
      .eq('id', req.params.taskId)
      .single();

    if (error || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can view this task
    const isCreator = task.assigned_by === currentUser.id;
    const isAssigned = task.task_assignments?.some(a => a.user_id === currentUser.id);
    const isAdmin = currentUser.role === 'admin';

    if (!isCreator && !isAssigned && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get creator details
    const { data: creator } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', task.assigned_by)
      .single();

    const assignees = task.task_assignments?.map(a => a.users) || [];

    const responseTask = {
      ...task,
      _id: task.id.toString(),
      id: task.id,
      dueDate: task.due_date,
      stuckReason: task.stuck_reason,
      assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
      assignedTo: assignees.map(u => ({ _id: u.id.toString(), id: u.id, name: u.name, email: u.email }))
    };

    res.json(responseTask);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Update task (status, details, approval)
router.patch('/:taskId', auth, async (req, res) => {
  try {
    const { status, remark, title, description, assignedTo, priority, dueDate, company, approval_status, rejection_reason, stuckReason } = req.body;
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
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get task details for notifications
    const { data: task } = await supabase
      .from('tasks')
      .select('*, task_assignments(user_id)')
      .eq('id', req.params.taskId)
      .single();
    
    // Handle approval/rejection — canUserUpdateTask already verified access
    if (approval_status || rejection_reason) {
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      const updateData = {};
      if (approval_status === 'approved') {
        // Delete task completely on approval
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', req.params.taskId);
        if (deleteError) throw deleteError;

        const Notification = require('../models/notification');
        const assigneeIds = task.task_assignments?.map(a => a.user_id) || [];
        for (const assigneeId of assigneeIds) {
          await Notification.create(assigneeId, `Task "${task.title}" has been approved by creator`);
        }
        return res.json({ message: 'Task approved and deleted successfully' });
      } else if (approval_status) {
        updateData.approval_status = approval_status;
      }
      
      if (rejection_reason) {
        // Direct update — bypass updateData pattern to ensure all fields are written
        const { data: rejectedTask, error: rejectError } = await supabase
          .from('tasks')
          .update({ status: 'Working on it', approval_status: 'rejected', rejection_reason: rejection_reason })
          .eq('id', req.params.taskId)
          .select()
          .single();
        if (rejectError) throw rejectError;
        console.log('Rejection direct update result:', rejectedTask);
        const Notification = require('../models/notification');
        const assigneeIds = task.task_assignments?.map(a => a.user_id) || [];
        for (const assigneeId of assigneeIds) {
          await Notification.create(assigneeId, `Task "${task.title}" has been rejected: ${rejection_reason}`);
        }
        return res.json({ message: 'Task rejected successfully', task: rejectedTask });
      }
    }
    
    // If it's a status update, validate progression
    if (status && !title) {
      const currentStatus = task.status;
      
      // Define status progression rules
      const statusProgression = {
        'Not Started': ['Working on it', 'Stuck', 'Done'],
        'Working on it': ['Stuck', 'Done', 'Not Started'],
        'Stuck': ['Working on it', 'Done', 'Not Started'],
        'Done': ['Working on it', 'Stuck', 'Not Started'],
        'Pending Approval': ['Not Started', 'Working on it', 'Stuck', 'Done'] // Allow any transition from Pending
      };
      
      // Update with stuck reason if provided
      const updateData = { status };
      if (stuckReason) {
        updateData.stuck_reason = stuckReason;
      }
      
      // When moving to Done: preserve rejected status, otherwise set pending
      if (status === 'Done') {
        if (task.approval_status !== 'rejected') {
          updateData.approval_status = 'pending';
        }
        // Only clear rejection_reason if not rejected (rejected tasks keep their reason)
      }
      
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', req.params.taskId)
        .select()
        .single();
      
      if (error) throw error;
      
      return res.json({ message: 'Task status updated', task: updatedTask });
    }
    
    // If it's a full task update (creator or admin can edit)
    if (title && description) {
      // Get task to check creator
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('assigned_by')
        .eq('id', req.params.taskId)
        .single();
      
      const isCreator = existingTask && existingTask.assigned_by === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ message: 'Access denied. Only task creator or admin can edit task details.' });
      }
      
      // Update task details
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          priority: priority || 3,
          due_date: dueDate,
          company,
          status: 'Not Started',
          approval_status: 'approved'
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

// Update entire task (Creator or Admin)
router.put('/:taskId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { title, description, assignedTo, priority, dueDate, company } = req.body;
    
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Title, description, and assignees are required' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Check if user is creator or admin
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('assigned_by')
      .eq('id', req.params.taskId)
      .single();
    
    const isCreator = existingTask && existingTask.assigned_by === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Access denied. Only task creator or admin can edit tasks.' });
    }

    const assigneeArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        priority,
        due_date: dueDate,
        company: company || currentUser.company,
        status: 'Not Started',
        approval_status: 'approved'
      })
      .eq('id', req.params.taskId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update task assignments
    await supabase.from('task_assignments').delete().eq('task_id', req.params.taskId);
    
    const assignments = assigneeArray.map(userId => ({
      task_id: parseInt(req.params.taskId),
      user_id: parseInt(userId)
    }));
    
    await supabase.from('task_assignments').insert(assignments);
    
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Delete task (Admin or Creator can delete)
router.delete('/:taskId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get task to check creator
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('assigned_by')
      .eq('id', req.params.taskId)
      .single();
    
    if (fetchError || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Allow if user is admin OR task creator
    const isCreator = task.assigned_by === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Access denied. Only task creator or admin can delete tasks.' });
    }

    await Task.deleteById(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
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

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get task details
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*, task_assignments(user_id)')
      .eq('id', req.params.taskId)
      .single();
    
    if (fetchError || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Update task to approved and set status to Not Started
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({ 
        approval_status: 'approved',
        status: 'Not Started'
      })
      .eq('id', req.params.taskId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Send notification to task creator
    const Notification = require('../models/notification');
    await Notification.create(
      task.assigned_by,
      `Your task "${task.title}" has been approved by admin`
    );
    
    // Send notification to assignees
    const assigneeIds = task.task_assignments?.map(a => a.user_id) || [];
    for (const assigneeId of assigneeIds) {
      await Notification.create(assigneeId, `Task "${task.title}" has been approved by admin`);
    }
    
    res.json({ message: 'Task approved successfully', task: updatedTask });
  } catch (err) {
    console.error('Error approving task:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Reject task (Admin only) - Deletes task completely
router.post('/:taskId/reject', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can reject tasks.' });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Get task details before deletion
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.taskId)
      .single();
    
    if (fetchError || !task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Send notification to task creator before deletion
    const Notification = require('../models/notification');
    await Notification.create(
      task.assigned_by,
      `Your task "${task.title}" has been rejected: ${reason.trim()}`
    );
    
    // Send notification to assignees
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', req.params.taskId);
    
    const assigneeIds = assignments?.map(a => a.user_id) || [];
    for (const assigneeId of assigneeIds) {
      await Notification.create(assigneeId, `Task "${task.title}" has been rejected by admin: ${reason.trim()}`);
    }
    
    // Delete task  completely
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.taskId);
    
    if (deleteError) throw deleteError;
    
    res.json({ message: 'Task rejected and deleted successfully' });
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

// Cleanup old approved tasks (30 days) - Admin only
router.delete('/cleanup/old-approved', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can run cleanup.' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Delete approved tasks older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: deletedTasks, error } = await supabase
      .from('tasks')
      .delete()
      .eq('approval_status', 'approved')
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .select();
    
    if (error) throw error;
    
    res.json({ 
      message: `Cleanup completed. ${deletedTasks?.length || 0} approved tasks older than 30 days were deleted.`,
      deletedCount: deletedTasks?.length || 0,
      deletedTasks: deletedTasks?.map(t => ({ id: t.id, title: t.title, updated_at: t.updated_at }))
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;
