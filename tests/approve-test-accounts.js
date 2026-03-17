const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function approveTestAccounts() {
  console.log('🔧 Approving test accounts...\n');

  try {
    // Approve test admin
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .update({ account_status: 'active' })
      .eq('email', 'admin@example.com')
      .select();

    if (adminError) throw adminError;
    if (admin && admin.length > 0) {
      console.log('✅ Test admin approved:', admin[0].email);
    } else {
      console.log('⚠️  Test admin not found');
    }

    // Approve test user
    const { data: user, error: userError } = await supabase
      .from('users')
      .update({ account_status: 'active' })
      .eq('email', 'test@example.com')
      .select();

    if (userError) throw userError;
    if (user && user.length > 0) {
      console.log('✅ Test user approved:', user[0].email);
    } else {
      console.log('⚠️  Test user not found');
    }

    console.log('\n✅ Test accounts approved! Run tests again:\n   npm test\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

approveTestAccounts();
