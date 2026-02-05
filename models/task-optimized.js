const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class TaskOptimized {
  // Optimized method to get visible tasks with single query
  static async findVisibleToUserOptimized(userId, userRole, userCompany) {
    console.log('Finding visible tasks (optimized) for user:', { userId, userRole, userCompany });
    
    const userIdInt = parseInt(userId);
    
    // Single optimized query with all joins
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:users!tasks_assigned_by_fkey(id, name, email),
        task_assignments(
          user_id,
          assignee:users(id, name, email, account_status)
        )
      `)
      .or(`approval_status.eq.approved,assigned_by.eq.${userIdInt}`)
      .eq('company', userCompany)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
    
    // Transform data efficiently
    return tasks.map(task => ({
      ...task,
      _id: task.id.toString(),
      dueDate: task.due_date,
      stuckReason: task.stuck_reason,
      assignedBy: task.creator ? {
        _id: task.creator.id.toString(),
        name: task.creator.name,
        email: task.creator.email
      } : null,
      assignedTo: task.task_assignments
        ?.filter(a => a.assignee?.account_status === 'active')
        .map(a => ({
          _id: a.assignee.id.toString(),
          name: a.assignee.name,
          email: a.assignee.email
        })) || []
    }));
  }

  // Fix approval status for stuck tasks
  static async fixPendingTasks() {
    console.log('Fixing pending tasks...');
    
    // Auto-approve tasks that have been pending for more than 24 hours
    const { data, error } = await supabase
      .from('tasks')
      .update({ approval_status: 'approved' })
      .eq('approval_status', 'pending')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .select();
    
    if (error) throw error;
    
    console.log(`Fixed ${data?.length || 0} pending tasks`);
    return data;
  }
}

module.exports = TaskOptimized;