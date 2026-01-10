const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class Task {
  static async create(taskData) {
    const { title, description, assignedBy, assignedTo, priority = 3, dueDate, company } = taskData;
    
    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_by: assignedBy,
        priority,
        due_date: dueDate,
        company
      })
      .select()
      .single();
    
    if (taskError) throw taskError;
    
    // Create task assignments
    if (assignedTo && assignedTo.length > 0) {
      // Convert usernames to user IDs if needed
      const userIds = [];
      for (const assignee of assignedTo) {
        if (typeof assignee === 'string' && isNaN(assignee)) {
          // It's a username, convert to user ID
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
          // It's already a user ID
          userIds.push(parseInt(assignee));
        }
      }
      
      const assignments = userIds.map(userId => ({
        task_id: task.id,
        user_id: userId,
        status: 'Not Started'
      }));
      
      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments);
      
      if (assignError) throw assignError;
    }
    
    return task;
  }

  static async findAssignedToUser(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments!inner(
          user_id,
          status,
          completion_remark
        )
      `)
      .eq('task_assignments.user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to match expected format
    return data.map(task => ({
      ...task,
      _id: task.id,
      assigneeStatuses: task.task_assignments.map(ta => ({
        user: ta.user_id,
        status: ta.status,
        completionRemark: ta.completion_remark
      }))
    }));
  }

  static async findAssignedByUser(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments(
          user_id,
          status,
          completion_remark
        )
      `)
      .eq('assigned_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(task => ({
      ...task,
      _id: task.id,
      assigneeStatuses: task.task_assignments.map(ta => ({
        user: ta.user_id,
        status: ta.status,
        completionRemark: ta.completion_remark
      }))
    }));
  }

  static async updateUserStatus(taskId, userId, status, remark = null) {
    const { data, error } = await supabase
      .from('task_assignments')
      .update({
        status,
        completion_remark: remark
      })
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single();
    
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