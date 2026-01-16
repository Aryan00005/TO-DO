require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupSuperAdmin() {
  try {
    console.log('🚀 Setting up Super Admin...\n');
    
    // Create Super Admin account
    console.log('👤 Creating Super Admin account...');
    
    const superAdminData = {
      name: 'Super Admin',
      email: 'superadmin@taskmanager.com',
      user_id: 'superadmin',
      password: await bcrypt.hash('SuperAdmin@123', 12),
      auth_provider: 'local',
      account_status: 'active',
      role: 'admin',
      is_super_admin: true,
      company: null
    };
    
    // Check if super admin already exists
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', 'superadmin')
      .single();
    
    if (existing) {
      console.log('⚠️  Super Admin already exists. Updating...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_super_admin: true })
        .eq('user_id', 'superadmin');
      
      if (updateError) throw updateError;
      console.log('✅ Super Admin updated');
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert(superAdminData)
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Super Admin created successfully');
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Super Admin Credentials:');
    console.log('   User ID: superadmin');
    console.log('   Password: SuperAdmin@123');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupSuperAdmin();
