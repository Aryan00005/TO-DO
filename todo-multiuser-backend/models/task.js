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
    
    // Check if any assignee is an admin — batch fetch all assignee roles in one query
    let approvalStatus = 'approved';
    let hasAdminAssignee = false;

    if (assignedTo && assignedTo.length > 0) {
      const numericIds = assignedTo.filter(a => !isNaN(a)).map(a => parseInt(a));
      const nameIds = assignedTo.filter(a => typeof a === 'string' && isNaN(a));

      const queries = [];
      if (numericIds.length > 0) {
        queries.push(supabase.from('users').select('id, role').in('id', numericIds));
      }
      if (nameIds.length > 0) {
        queries.push(supabase.from('users').select('id, role').in('name', nameIds));
      }

      const results = await Promise.all(queries);
      const allAssigneeUsers = results.flatMap(r => r.data || []);
      hasAdminAssignee = allAssigneeUsers.some(u => u.role === 'admin');
    }
    
    // If admin is assigned AND the creator is NOT that admin (i.e. a user assigned to admin), set to pending
    // If admin self-assigns, skip approval — task goes straight to approved/Not Started
    const creatorIsAdmin = creator.role === 'admin';
    if (hasAdminAssignee && !creatorIsAdmin) {
      approvalStatus = 'pending';
    }
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_by: assignedBy,
        priority,
        due_date: dueDate,
        company: taskCompany,
        created_by_admin: createdByAdmin,
        status: approvalStatus === 'pending' ? 'Pending Approval' : 'Not Started',
        approval_status: approvalStatus
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Task creation error:', taskError);
      throw taskError;
    }
    
    console.log('Task created:', task);
    
    if (assignedTo && assignedTo.length > 0) {
      // Resolve names to IDs if needed
      const nameAssignees = assignedTo.filter(a => typeof a === 'string' && isNaN(a));
      let resolvedIds = assignedTo.filter(a => !isNaN(a)).map(a => parseInt(a));

      if (nameAssignees.length > 0) {
        const { data: namedUsers, error: nameError } = await supabase
          .from('users').select('id, name').in('name', nameAssignees);
        if (nameError) throw nameError;
        const missing = nameAssignees.filter(n => !namedUsers?.find(u => u.name === n));
        if (missing.length > 0) throw new Error(`Users not found: ${missing.join(', ')}`);
        resolvedIds = [...resolvedIds, ...(namedUsers?.map(u => u.id) || [])];
      }

      const assignments = resolvedIds.map(userId => ({ task_id: task.id, user_id: userId }));
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments);
      if (assignError) throw assignError;

      // Batch fetch assignee roles + creator name in parallel
      const Notification = require('./notification');
      const [{ data: assigneeUsers }, { data: creatorData }] = await Promise.all([
        supabase.from('users').select('id, role').in('id', resolvedIds),
        supabase.from('users').select('name').eq('id', assignedBy).single()
      ]);

      const creatorName = creatorData?.name || 'Someone';
      const assigneeRoleMap = Object.fromEntries((assigneeUsers || []).map(u => [u.id, u.role]));

      await Promise.all(resolvedIds.map(userId => {
        const msg = assigneeRoleMap[userId] === 'admin' && hasAdminAssignee
          ? `Task approval required: "${title}" assigned by ${creatorName}`
          : `New task assigned: "${title}" by ${creatorName}`;
        return Notification.create(userId, msg).catch(e => console.error('Notification failed:', e));
      }));
    }
    
    return task;
  }

  static async findAssignedToUser(userId) {
    const userIdInt = parseInt(userId);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`*, task_assignments!inner(user_id, users(id, name, email))`)
      .eq('task_assignments.user_id', userIdInt)
      .in('approval_status', ['approved', 'rejected', 'pending'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const uniqueTasks = (tasks || []).filter((t, i, self) => i === self.findIndex(x => x.id === t.id));

    // Batch fetch all creators in one query
    const creatorIds = [...new Set(uniqueTasks.map(t => t.assigned_by))];
    const { data: creators } = await supabase.from('users').select('id, name, email').in('id', creatorIds);
    const creatorMap = Object.fromEntries((creators || []).map(u => [u.id, u]));

    return uniqueTasks.map(task => {
      const creator = creatorMap[task.assigned_by];
      const assignees = task.task_assignments?.map(a => a.users).filter(Boolean) || [];
      return {
        ...task,
        _id: task.id.toString(),
        dueDate: task.due_date,
        stuckReason: task.stuck_reason,
        approvalStatus: task.approval_status,
        approval_status: task.approval_status,
        approved_at: task.approved_at,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: assignees.length === 1
          ? { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email }
          : assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    });
  }

  static async findAssignedByUser(userId) {
    const userIdInt = parseInt(userId);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`*, task_assignments(user_id, users(id, name, email))`)
      .eq('assigned_by', userIdInt)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (tasks || []).map(task => {
      const assignees = task.task_assignments?.map(a => a.users).filter(Boolean) || [];
      return {
        ...task,
        _id: task.id.toString(),
        dueDate: task.due_date,
        stuckReason: task.stuck_reason,
        approvalStatus: task.approval_status,
        approval_status: task.approval_status,
        approved_at: task.approved_at,
        assignedTo: assignees.length === 1
          ? { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email }
          : assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    });
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
      .update({ 
        approval_status: 'approved',
        status: 'Not Started'
      })
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
    const userIdInt = parseInt(userId);

    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select(`*, task_assignments(user_id, users(id, name, email))`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const visibleTasks = (allTasks || []).filter(task => {
      const isCreator = task.assigned_by === userIdInt;
      const isAssigned = task.task_assignments?.some(a => a.user_id === userIdInt);
      const isApproved = task.approval_status === 'approved';
      const isRejected = task.approval_status === 'rejected';

      // Hide approved tasks older than 24h (but never hide rejected tasks)
      if (isApproved && !isRejected && task.approved_at) {
        const hoursSinceApproval = (Date.now() - new Date(task.approved_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceApproval >= 24) return false;
      }

      if (isCreator) return true;
      if (isAssigned && (isApproved || isRejected)) return true;
      return false;
    });

    // Batch fetch all unique creators in one query
    const creatorIds = [...new Set(visibleTasks.map(t => t.assigned_by))];
    const { data: creators } = await supabase.from('users').select('id, name, email').in('id', creatorIds);
    const creatorMap = Object.fromEntries((creators || []).map(u => [u.id, u]));

    return visibleTasks.map(task => {
      const creator = creatorMap[task.assigned_by];
      const isCreator = task.assigned_by === userIdInt;
      const allAssignees = task.task_assignments?.map(a => a.users).filter(Boolean) || [];
      const displayAssignees = isCreator
        ? allAssignees
        : allAssignees.filter(a => parseInt(a.id) === userIdInt);

      return {
        ...task,
        _id: task.id.toString(),
        dueDate: task.due_date,
        stuckReason: task.stuck_reason,
        approvalStatus: task.approval_status,
        approval_status: task.approval_status,
        approved_at: task.approved_at,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: displayAssignees.length === 1
          ? { _id: displayAssignees[0].id.toString(), name: displayAssignees[0].name, email: displayAssignees[0].email }
          : displayAssignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    });
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