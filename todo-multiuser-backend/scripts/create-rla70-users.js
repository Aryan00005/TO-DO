require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createRLA70Users() {
  console.log('🚀 Creating users in "RLA70" company...\n');

  const users = [
    { userId: 'Aryan', email: 'aryan@gmail.com', name: 'Aryan' },
    { userId: 'Jayraj', email: 'jayraj@gmail.com', name: 'Jayraj' }
  ];

  const password = 'Raj@7070';
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
          company: 'RLA70',
          account_status: 'active'
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

  console.log('\n✅ Done!\n');
  console.log('📝 Login credentials:');
  console.log('   Company Code: RLA70');
  console.log('   Password: Raj@7070');
  console.log('   Users: Aryan, Jayraj\n');
}

createRLA70Users();
