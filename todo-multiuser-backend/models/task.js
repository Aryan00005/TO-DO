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

      // Insert assignments with per-user status and approval_status
      const initialStatus = approvalStatus === 'pending' ? 'Pending Approval' : 'Not Started';
      const initialApproval = approvalStatus === 'pending' ? 'pending' : 'approved';
      const assignments = resolvedIds.map(userId => ({
        task_id: task.id,
        user_id: userId,
        status: initialStatus,
        approval_status: initialApproval
      }));
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
        // Only send approval notification if task is actually pending (user assigned to admin, not self-assigned)
        const isAdminAssignee = assigneeRoleMap[userId] === 'admin';
        const isSelfAssign = parseInt(userId) === parseInt(assignedBy);
        const msg = isAdminAssignee && hasAdminAssignee && !isSelfAssign
          ? `Task approval required: "${title}" assigned by ${creatorName}`
          : `New task assigned: "${title}" by ${creatorName}`;
        return Notification.create(userId, msg).catch(e => console.error('Notification failed:', e));
      }));
    }
    
    return task;
  }

  static async findAssignedToUser(userId) {
    const userIdInt = parseInt(userId);

    const { data: assignments, error: aErr } = await supabase
      .from('task_assignments')
      .select('task_id, status, stuck_reason, rejection_reason, approval_status')
      .eq('user_id', userIdInt);
    if (aErr) throw aErr;
    if (!assignments || assignments.length === 0) return [];

    // Exclude tasks where THIS user's assignment is already approved (task done for them)
    const activeAssignments = assignments.filter(a => a.approval_status !== 'approved');
    if (activeAssignments.length === 0) return [];

    const taskIds = activeAssignments.map(a => a.task_id);
    const assignmentMap = Object.fromEntries(activeAssignments.map(a => [a.task_id, a]));

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, task_assignments(user_id, status, users(id, name, email))')
      .in('id', taskIds)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const creatorIds = [...new Set((tasks || []).map(t => t.assigned_by))];
    const { data: creators } = await supabase.from('users').select('id, name, email').in('id', creatorIds);
    const creatorMap = Object.fromEntries((creators || []).map(u => [u.id, u]));

    return (tasks || []).map(task => {
      const creator = creatorMap[task.assigned_by];
      const myAssignment = assignmentMap[task.id];
      const assignees = task.task_assignments?.map(a => a.users).filter(Boolean) || [];
      return {
        ...task,
        _id: task.id.toString(),
        status: myAssignment?.status || task.status,
        dueDate: task.due_date,
        stuckReason: myAssignment?.stuck_reason || task.stuck_reason,
        rejectionReason: myAssignment?.rejection_reason || task.rejection_reason,
        // Per-user approval status from task_assignments
        approvalStatus: myAssignment?.approval_status || 'pending',
        approval_status: myAssignment?.approval_status || 'pending',
        approved_at: task.approved_at,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo: assignees.length === 1
          ? { _id: assignees[0].id.toString(), name: assignees[0].name, email: assignees[0].email }
          : assignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
      };
    });
  }

  static async findAssignedByUser(userId, company) {
    const userIdInt = parseInt(userId);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, task_assignments(user_id, status, stuck_reason, rejection_reason, approval_status, users(id, name, email))')
      .eq('assigned_by', userIdInt)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const expanded = [];
    for (const task of (tasks || [])) {
      const assignments = task.task_assignments || [];
      if (assignments.length === 0) {
        expanded.push({ ...task, _id: task.id.toString(), dueDate: task.due_date, stuckReason: task.stuck_reason, approvalStatus: task.approval_status, approval_status: task.approval_status, approved_at: task.approved_at, assignedTo: null });
      } else {
        for (const assignment of assignments) {
          const assignee = assignment.users;
          if (!assignee) continue;
          // Per-user approval_status: fall back to task-level for old data
          const perUserApproval = assignment.approval_status || task.approval_status;
          expanded.push({
            ...task,
            _id: task.id.toString(),
            status: assignment.status || task.status,
            dueDate: task.due_date,
            stuckReason: assignment.stuck_reason || task.stuck_reason,
            rejectionReason: assignment.rejection_reason || task.rejection_reason,
            approvalStatus: perUserApproval,
            approval_status: perUserApproval,
            approved_at: task.approved_at,
            assignedTo: { _id: assignee.id.toString(), name: assignee.name, email: assignee.email }
          });
        }
      }
    }
    return expanded;
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
    const { data, error } = await supabase
      .from('tasks')
      .update({ approval_status: 'approved', status: 'Not Started' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
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

    // Fetch this user's assignment rows with per-user status AND per-user approval_status
    const { data: ua, error: uaErr } = await supabase
      .from('task_assignments')
      .select('task_id, status, stuck_reason, rejection_reason, approval_status')
      .eq('user_id', userIdInt);
    if (uaErr) throw uaErr;

    // Include ALL assignment rows in the set (approved or not)
    // Self-assigned tasks (assigned_by === userIdInt) must always stay visible.
    // Non-self-assigned approved tasks are excluded in the visibleTasks filter below.
    const assignedTaskIds = new Set((ua || []).map(a => a.task_id));
    // Set of task_ids where this user's assignment is approved (used to hide non-self-assigned done tasks)
    const approvedTaskIds = new Set((ua || []).filter(a => a.approval_status === 'approved').map(a => a.task_id));
    // Keep full map (including approved) so creator view still works
    const assignmentMap = Object.fromEntries((ua || []).map(a => [a.task_id, a]));

    console.log('[findVisibleToUser] userId:', userIdInt, '| active assignedTaskIds:', [...assignedTaskIds]);

    // Fetch only tasks relevant to this user — their own assignments + tasks they created
    // This avoids the limit(200) problem where old tasks get cut off
    const allAssignedTaskIds = [...new Set((ua || []).map(a => a.task_id))];

    // Fetch tasks assigned to this user
    const assignedTasksQuery = allAssignedTaskIds.length > 0
      ? supabase
          .from('tasks')
          .select('*, task_assignments(user_id, status, stuck_reason, rejection_reason, approval_status, users(id, name, email))')
          .in('id', allAssignedTaskIds)
      : Promise.resolve({ data: [], error: null });

    // Fetch tasks created by this user
    const createdTasksQuery = supabase
      .from('tasks')
      .select('*, task_assignments(user_id, status, stuck_reason, rejection_reason, approval_status, users(id, name, email))')
      .eq('assigned_by', userIdInt)
      .order('created_at', { ascending: false });

    const [assignedResult, createdResult] = await Promise.all([assignedTasksQuery, createdTasksQuery]);
    if (assignedResult.error) throw assignedResult.error;
    if (createdResult.error) throw createdResult.error;

    // Merge and deduplicate
    const taskMap = new Map();
    [...(assignedResult.data || []), ...(createdResult.data || [])].forEach(t => taskMap.set(t.id, t));
    const allTasks = [...taskMap.values()];

    console.log('[findVisibleToUser] allTasks count:', allTasks.length);

    const visibleTasks = allTasks.filter(task => {
      const isCreator = task.assigned_by === userIdInt;
      const isAssigned = assignedTaskIds.has(task.id);
      const isSelfAssigned = isCreator && isAssigned;

    // Hide tasks where this user's assignment is approved AND it's not self-assigned
      // AND the task is actually Done (approved = completed for this user)
      // Active tasks (Not Started, Working on it, Stuck) with approval_status='approved' must still show
      if (isAssigned && !isSelfAssigned && approvedTaskIds.has(task.id)) {
        const myAssign = assignmentMap[task.id];
        const myStatus = myAssign?.status || task.status;
        if (myStatus === 'Done') return false;
      }

      // Only filter by company for creator-only tasks
      if (isCreator && !isAssigned && task.company !== userCompany) return false;
      if (isCreator) return true;
      if (isAssigned) return true;
      return false;
    });

    console.log('[findVisibleToUser] visibleTasks:', visibleTasks.map(t => ({ id: t.id, title: t.title, isCreator: t.assigned_by === userIdInt, isAssigned: assignedTaskIds.has(t.id) })));

    const creatorIds = [...new Set(visibleTasks.map(t => t.assigned_by))];
    const { data: creators } = await supabase.from('users').select('id, name, email').in('id', creatorIds);
    const creatorMap = Object.fromEntries((creators || []).map(u => [u.id, u]));

    return visibleTasks.map(task => {
      const creator = creatorMap[task.assigned_by];
      const myAssignment = assignmentMap[task.id];
      const allAssignees = task.task_assignments?.map(a => a.users).filter(Boolean) || [];

      const list = allAssignees.length > 0
        ? allAssignees.map(u => ({ _id: u.id.toString(), name: u.name, email: u.email }))
        : [];

      // Guarantee current user appears in assignedTo if they are in task_assignments
      if ((ua || []).some(a => a.task_id === task.id) && !list.some(u => u._id === String(userIdInt))) {
        list.push({ _id: String(userIdInt), name: '', email: '' });
      }

      const assignedTo = list.length === 0
        ? { _id: String(userIdInt), name: '', email: '' }
        : list.length === 1 ? list[0] : list;

      // Per-user approval_status: fall back to task-level for old data without the column
      const myApprovalStatus = myAssignment?.approval_status || task.approval_status;

      return {
        ...task,
        _id: task.id.toString(),
        status: myAssignment?.status || task.status,
        dueDate: task.due_date,
        stuckReason: myAssignment?.stuck_reason || task.stuck_reason,
        rejectionReason: myAssignment?.rejection_reason || task.rejection_reason,
        approvalStatus: myApprovalStatus,
        approval_status: myApprovalStatus,
        approved_at: task.approved_at,
        assignedBy: creator ? { _id: creator.id.toString(), name: creator.name, email: creator.email } : null,
        assignedTo
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