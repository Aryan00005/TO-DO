const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class Task {
  static async create(taskData) {
    const { title, description, assignedBy, assignedTo, priority = 3, dueDate, company, createdByAdmin = false } = taskData;
    
    console.log('Creating task with data:', taskData);
    
    // Get creator details including company
    const { data: creator } = await supabase
      .from('users')
      .select('role, company')
      .eq('id', assignedBy)
      .single();
    
    if (!creator) {
      throw new Error('Creator not found');
    }
    
    // Use creator's company if no company specified
    const taskCompany = company || creator.company;
    
    if (!taskCompany) {
      throw new Error('Task must have a company assigned');
    }
    
    let approvalStatus = 'approved'; // Default for admin tasks
    let assignedByRole = creator?.role || 'user';
    let assignedToRole = 'user';
    
    // Check if any assignee is an admin (for user->admin approval)
    if (assignedTo && assignedTo.length > 0) {
      for (const assignee of assignedTo) {
        let userId = assignee;
        if (typeof assignee === 'string' && isNaN(assignee)) {
          const { data: user } = await supabase
            .from('users')
            .select('id, role')
            .eq('name', assignee)
            .single();
          if (user) {
            userId = user.id;
            if (user.role === 'admin' && creator?.role !== 'admin') {
              approvalStatus = 'pending'; // User assigning to admin needs approval
              assignedToRole = 'admin';
            }
          }
        } else {
          const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', parseInt(assignee))
            .single();
          if (user?.role === 'admin' && creator?.role !== 'admin') {
            approvalStatus = 'pending'; // User assigning to admin needs approval
            assignedToRole = 'admin';
          }
        }
      }
    }
    
    // Admin tasks are always approved and visible
    if (creator?.role === 'admin') {
      approvalStatus = 'approved';
    }
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_by: assignedBy,
        priority,
        due_date: dueDate,
        company: taskCompany, // Use determined company
        created_by_admin: createdByAdmin,
        status: 'Not Started',
        approval_status: approvalStatus,
        assigned_by_role: assignedByRole,
        assigned_to_role: assignedToRole
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Task creation error:', taskError);
      throw taskError;
    }
    
    console.log('Task created:', task);
    
    if (assignedTo && assignedTo.length > 0) {
      const userIds = [];
      for (const assignee of assignedTo) {
        if (typeof assignee === 'string' && isNaN(assignee)) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('name', assignee)
            .single();
          
          if (userError || !user) {
            throw new Error(`User not found: ${assignee}`);
          }
          userIds.push(user.id);
        } else {
          userIds.push(parseInt(assignee));
        }
      }
      
      console.log('Creating assignments for users:', userIds);
      
      const assignments = userIds.map(userId => ({
        task_id: task.id,
        user_id: userId
      }));
      
      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments);
      
      if (assignError) {
        console.error('Assignment error:', assignError);
        throw assignError;
      }
      
      console.log('Assignments created successfully');
      
      // Create notifications for assigned users (only if task is approved)
      if (approvalStatus === 'approved') {
        const Notification = require('./notification');
        const { data: creatorData } = await supabase
          .from('users')
          .select('name')
          .eq('id', assignedBy)
          .single();
        
        const creatorName = creatorData?.name || 'Someone';
        
        for (const userId of userIds) {
          try {
            await Notification.create(userId, `New task assigned: "${title}" by ${creatorName}`);
          } catch (notifError) {
            console.error('Notification creation failed:', notifError);
          }
        }
      } else if (approvalStatus === 'pending') {
        // Create approval notification for admin when user assigns task to admin
        const Notification = require('./notification');
        const { data: creatorData } = await supabase
          .from('users')
          .select('name')
          .eq('id', assignedBy)
          .single();
        
        const creatorName = creatorData?.name || 'Someone';
        
        // Find ALL admin users to notify (not just in same company)
        const { data: adminUsers } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('account_status', 'active');
        
        if (adminUsers && adminUsers.length > 0) {
          for (const admin of adminUsers) {
            try {
              await Notification.create(admin.id, `Task approval required: "${title}" assigned by ${creatorName}`);
              console.log(`Approval notification sent to admin ${admin.id}`);
            } catch (notifError) {
              console.error('Admin notification creation failed:', notifError);
            }
          }
        }
      }
    }
    
    return task;
  }

  static async findAssignedToUser(userId) {
    console.log('Finding tasks for user ID:', userId);
    
    // Get user's company first
    const { data: currentUser } = await supabase
      .from('users')
      .select('company')
      .eq('id', userId)
      .single();
    
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Get tasks where user is assigned with full details - filtered by company
    const { data: assignedTasks, error: assignedError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments!inner(
          user_id
        )
      `)
      .eq('task_assignments.user_id', userId)
      .eq('company', currentUser.company) // Company filter
      .order('created_at', { ascending: false });
    
    if (assignedError) throw assignedError;
    
    // Get tasks created by user - filtered by company
    const { data: createdTasks, error: createdError } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', userId)
      .eq('company', currentUser.company) // Company filter
      .order('created_at', { ascending: false });
    
    if (createdError) throw createdError;
    
    // Combine and deduplicate
    const taskMap = new Map();
    [...(assignedTasks || []), ...(createdTasks || [])].forEach(task => {
      taskMap.set(task.id, task);
    });
    
    const tasks = Array.from(taskMap.values());
    
    // Populate assignee and creator details
    const populatedTasks = await Promise.all(tasks.map(async (task) => {
      // Get creator details
      const { data: creator } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', task.assigned_by)
        .single();
      
      // Get assignees details
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
        stuckReason: task.stuck_reason,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: assignees.length === 1 ? 
          { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email } : 
          assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    }));
    
    return populatedTasks;
  }

  static async findAssignedByUser(userId) {
    const userIdInt = parseInt(userId);
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', userIdInt)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Populate assignee details for each task
    const populatedTasks = await Promise.all(tasks.map(async (task) => {
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
        stuckReason: task.stuck_reason,
        assignedTo: assignees.length === 1 ? 
          { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email } : 
          assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    }));

    return populatedTasks;
  }

  static async updateTaskStatus(taskId, status, remark = null) {
    console.log('Task.updateTaskStatus called with:', { taskId, status, remark });
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status,
        stuck_reason: remark
      })
      .eq('id', taskId)
      .select()
      .single();
    
    console.log('Supabase update result:', { data, error });
    
    if (error) throw error;
    return data;
  }

  static async deleteById(taskId) {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // New methods for approval system
  static async approveTask(taskId, adminId) {
    console.log('Task.approveTask called with:', { taskId, adminId });
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ approval_status: 'approved' })
      .eq('id', taskId)
      .eq('approval_status', 'pending')
      .select()
      .single();
    
    if (error) {
      console.error('Task approval error:', error);
      throw error;
    }
    
    console.log('Task approved successfully:', data);
    return data;
  }

  static async rejectTask(taskId, adminId) {
    console.log('Task.rejectTask called with:', { taskId, adminId });
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ approval_status: 'rejected' })
      .eq('id', taskId)
      .eq('approval_status', 'pending')
      .select()
      .single();
    
    if (error) {
      console.error('Task rejection error:', error);
      throw error;
    }
    
    console.log('Task rejected successfully:', data);
    return data;
  }

  // Get pending task approvals for admin
  static async getPendingApprovals(adminId) {
    // Get admin's company first
    const { data: admin } = await supabase
      .from('users')
      .select('company')
      .eq('id', adminId)
      .single();
    
    if (!admin) {
      throw new Error('Admin not found');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(
          user_id,
          users(id, name, email)
        )
      `)
      .eq('approval_status', 'pending')
      .eq('company', admin.company)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async findVisibleToUser(userId, userRole, userCompany) {
    console.log('Finding visible tasks for user:', { userId, userRole, userCompany });
    
    // Ensure userId is an integer for comparison
    const userIdInt = parseInt(userId);
    
    // Get all tasks with assignments
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
    
    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
    
    console.log('All tasks fetched:', allTasks?.length || 0);
    
    // SIMPLIFIED LOGIC - Show ALL approved tasks + user's own tasks
    const visibleTasks = allTasks.filter(task => {
      const isCreator = task.assigned_by === userIdInt;
      const isAssigned = task.task_assignments?.some(a => a.user_id === userIdInt);
      
      console.log(`Task ${task.id}: creator=${isCreator}, assigned=${isAssigned}, approval=${task.approval_status}`);
      
      // Show approved tasks OR tasks created by user
      return task.approval_status === 'approved' || isCreator;
    });
    
    console.log('Visible tasks after filtering:', visibleTasks.length);
    
    // Transform tasks
    const transformedTasks = await Promise.all(visibleTasks.map(async (task) => {
      const { data: creator } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', task.assigned_by)
        .single();
      
      const assignees = task.task_assignments?.map(a => a.users).filter(u => u?.account_status === 'active') || [];
      
      return {
        ...task,
        _id: task.id.toString(),
        dueDate: task.due_date,
        stuckReason: task.stuck_reason,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: assignees.length === 1 ? 
          { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email } : 
          assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    }));
    
    console.log('Final transformed tasks:', transformedTasks.length);
    return transformedTasks;
  }

  static async canUserUpdateTask(taskId, userId, userRole) {
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(user_id)
      `)
      .eq('id', taskId)
      .single();
    
    if (error) throw error;
    
    // Admin can update any task in their company
    if (userRole === 'admin') return true;
    
    // Task creator can update
    if (task.assigned_by === userId) return true;
    
    // Assigned user can update status only
    const isAssigned = task.task_assignments.some(a => a.user_id === userId);
    return isAssigned;
  }
}

module.exports = Task;