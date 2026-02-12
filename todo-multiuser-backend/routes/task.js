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
    console.log('🔍 /tasks/visible called for user:', req.user.id);
    
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('👤 Current user:', { id: currentUser.id, role: currentUser.role, company: currentUser.company });

    const tasks = await Task.findVisibleToUser(currentUser.id, currentUser.role, currentUser.company);
    
    console.log('📋 Tasks returned:', tasks.length);
    console.log('📋 Task details:', tasks.map(t => ({ id: t._id, title: t.title, approval_status: t.approval_status, company: t.company })));
    
    res.json(tasks);
  } catch (err) {
    console.error('❌ Error fetching visible tasks:', err);
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
      // Get current task status from tasks table (not task_assignments)
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', req.params.taskId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current task status:', fetchError);
        return res.status(500).json({ message: 'Error fetching task status' });
      }
      
      const currentStatus = currentTask.status;
      
      // Define status progression rules (allow more flexible transitions)
      const statusProgression = {
        'Not Started': ['Working on it', 'Stuck', 'Done'],
        'Working on it': ['Stuck', 'Done', 'Not Started'],
        'Stuck': ['Working on it', 'Done', 'Not Started'],
        'Done': ['Working on it', 'Stuck', 'Not Started'] // Allow moving back from Done
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
    
    // Create notifications for assigned users when task is approved
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', req.params.taskId);
    
    if (assignments && assignments.length > 0) {
      const Notification = require('../models/notification');
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
    
    // Notify task creator about rejection
    const Notification = require('../models/notification');
    try {
      await Notification.create(task.assigned_by, `Task rejected: "${task.title}"`);
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }
    
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
