require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestUsers() {
  console.log('🚀 Creating 5 test users in "testing" company...\n');

  const users = [
    { userId: 'test2', email: 'test2@example.com', name: 'Test User 2' },
    { userId: 'test3', email: 'test3@example.com', name: 'Test User 3' },
    { userId: 'test4', email: 'test4@example.com', name: 'Test User 4' },
    { userId: 'test5', email: 'test5@example.com', name: 'Test User 5' },
    { userId: 'test6', email: 'test6@example.com', name: 'Test User 6' }
  ];

  const password = 'test123';
  const hashedPassword = await bcrypt.hash(password, 12);

  for (const user of users) {
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existing) {
        console.log(`⚠️  ${user.userId} already exists, skipping...`);
        continue;
      }

      // Create user
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: user.name,
          user_id: user.userId,
          email: user.email,
          password: hashedPassword,
          auth_provider: 'local',
          role: 'user',
          company: 'testing',
          account_status: 'active' // Auto-approve for testing
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to create ${user.userId}:`, error.message);
      } else {
        console.log(`✅ Created ${user.userId} (${user.email}) - ID: ${data.id}`);
      }
    } catch (err) {
      console.log(`❌ Error creating ${user.userId}:`, err.message);
    }
  }

  console.log('\n✅ Done! All test users created.\n');
  console.log('📝 Login credentials:');
  console.log('   Company Code: testing');
  console.log('   Password: test123');
  console.log('   Users: test2, test3, test4, test5, test6\n');
}

createTestUsers();
