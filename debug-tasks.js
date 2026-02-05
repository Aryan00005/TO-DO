const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugTaskIssues() {
  console.log('🔍 Starting task visibility debug...\n');

  try {
    // 1. Check all tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    console.log(`📊 Total tasks in database: ${allTasks.length}`);
    
    // 2. Group by approval status
    const statusGroups = allTasks.reduce((acc, task) => {
      acc[task.approval_status] = (acc[task.approval_status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Tasks by approval status:', statusGroups);

    // 3. Check pending tasks
    const pendingTasks = allTasks.filter(t => t.approval_status === 'pending');
    console.log(`\n⏳ Pending tasks (${pendingTasks.length}):`);
    pendingTasks.forEach(task => {
      console.log(`  - ${task.title} (ID: ${task.id}) - Created: ${task.created_at}`);
    });

    // 4. Check company distribution
    const companyGroups = allTasks.reduce((acc, task) => {
      const company = task.company || 'NO_COMPANY';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🏢 Tasks by company:', companyGroups);

    // 5. Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, company, account_status');

    if (usersError) throw usersError;

    console.log(`\n👥 Total users: ${users.length}`);
    const usersByRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    console.log('👥 Users by role:', usersByRole);

    // 6. Auto-fix pending tasks older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: fixedTasks, error: fixError } = await supabase
      .from('tasks')
      .update({ approval_status: 'approved' })
      .eq('approval_status', 'pending')
      .lt('created_at', oneHourAgo)
      .select();

    if (fixError) throw fixError;

    if (fixedTasks && fixedTasks.length > 0) {
      console.log(`\n✅ Auto-approved ${fixedTasks.length} old pending tasks`);
    }

    console.log('\n🎉 Debug completed successfully!');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugTaskIssues();
}

module.exports = { debugTaskIssues };