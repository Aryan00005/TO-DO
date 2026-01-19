const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class Task {
  static async create(taskData) {
    const { title, description, assignedBy, assignedTo, priority = 3, dueDate, company, createdByAdmin = false } = taskData;
    
    console.log('Creating task with data:', taskData);
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_by: assignedBy,
        priority,
        due_date: dueDate,
        company,
        created_by_admin: createdByAdmin,
        status: 'Not Started'
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
    }
    
    return task;
  }

  static async findAssignedToUser(userId) {
    console.log('Finding tasks for user ID:', userId);
    
    // Get tasks where user is assigned with full details
    const { data: assignedTasks, error: assignedError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments!inner(
          user_id
        )
      `)
      .eq('task_assignments.user_id', userId)
      .order('created_at', { ascending: false });
    
    if (assignedError) throw assignedError;
    
    // Get tasks created by user
    const { data: createdTasks, error: createdError } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', userId)
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
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', userId)
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
}

module.exports = Task;