const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanupApprovedTasks() {
  try {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('approval_status', 'approved')
      .lt('approved_at', fifteenDaysAgo);

    if (fetchError) throw fetchError;
    if (!oldTasks || oldTasks.length === 0) return { deletedCount: 0 };

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('approval_status', 'approved')
      .lt('approved_at', fifteenDaysAgo);

    if (deleteError) throw deleteError;

    console.log(`🧹 Deleted ${oldTasks.length} approved tasks older than 15 days`);
    return { deletedCount: oldTasks.length };
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

module.exports = { cleanupApprovedTasks };
