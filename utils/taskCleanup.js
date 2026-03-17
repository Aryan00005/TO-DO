const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Delete completed (Done) tasks older than 30 days from database
 */
async function cleanupOldDoneTasks() {
  try {
    console.log('🧹 Starting cleanup of old completed tasks...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find tasks that are Done and updated more than 30 days ago
    const { data: oldTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, updated_at')
      .eq('status', 'Done')
      .lt('updated_at', thirtyDaysAgo.toISOString());
    
    if (fetchError) throw fetchError;
    
    if (!oldTasks || oldTasks.length === 0) {
      console.log('✅ No old completed tasks to clean up');
      return { deletedCount: 0, tasks: [] };
    }
    
    console.log(`📋 Found ${oldTasks.length} completed tasks older than 30 days`);
    
    // Delete the tasks
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('status', 'Done')
      .lt('updated_at', thirtyDaysAgo.toISOString());
    
    if (deleteError) throw deleteError;
    
    console.log(`✅ Successfully deleted ${oldTasks.length} old completed tasks`);
    
    return {
      deletedCount: oldTasks.length,
      tasks: oldTasks.map(t => ({ id: t.id, title: t.title, updated_at: t.updated_at }))
    };
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

module.exports = { cleanupOldDoneTasks };
