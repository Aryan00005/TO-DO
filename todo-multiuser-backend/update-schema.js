const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateSchema() {
  try {
    console.log('🔄 Updating database schema for company admin system...');
    
    // Add role column
    console.log('Adding role column...');
    const { error: roleError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';`
    });
    if (roleError && !roleError.message.includes('already exists')) {
      console.error('Role column error:', roleError);
    }
    
    // Add company column
    console.log('Adding company column...');
    const { error: companyError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);`
    });
    if (companyError && !companyError.message.includes('already exists')) {
      console.error('Company column error:', companyError);
    }
    
    // Update existing users to have 'user' role
    console.log('Updating existing users...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'user' })
      .is('role', null);
    
    if (updateError) {
      console.error('Update users error:', updateError);
    }
    
    // Create indexes
    console.log('Creating indexes...');
    const { error: indexError1 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`
    });
    if (indexError1) console.error('Role index error:', indexError1);
    
    const { error: indexError2 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);`
    });
    if (indexError2) console.error('Company index error:', indexError2);
    
    console.log('✅ Database schema updated successfully!');
    console.log('📋 Summary:');
    console.log('  - Added role column (default: user)');
    console.log('  - Added company column');
    console.log('  - Updated existing users to have user role');
    console.log('  - Created indexes for role and company');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  updateSchema();
}

module.exports = { updateSchema };