const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugAuth(userId, password) {
  console.log('🔍 Debugging authentication for:', userId);
  
  try {
    // Check by userId
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!user) {
      // Check by email
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userId)
        .single();
      user = emailUser;
    }
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      user_id: user.user_id,
      auth_provider: user.auth_provider,
      account_status: user.account_status,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });
    
    if (!user.password) {
      console.log('❌ No password set for user');
      return;
    }
    
    // Test password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match:', isMatch);
    
    if (!isMatch) {
      // Test with different hash rounds
      console.log('🔄 Testing password with different hash methods...');
      
      // Test if password was stored as plain text (security issue)
      if (password === user.password) {
        console.log('⚠️  PASSWORD STORED AS PLAIN TEXT!');
      }
      
      // Test with bcrypt rounds 10
      const hash10 = await bcrypt.hash(password, 10);
      const match10 = await bcrypt.compare(password, hash10);
      console.log('🔐 Hash with 10 rounds works:', match10);
      
      // Test with bcrypt rounds 12
      const hash12 = await bcrypt.hash(password, 12);
      const match12 = await bcrypt.compare(password, hash12);
      console.log('🔐 Hash with 12 rounds works:', match12);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Usage: node debug-auth.js
const userId = process.argv[2];
const password = process.argv[3];

if (!userId || !password) {
  console.log('Usage: node debug-auth.js <userId> <password>');
  process.exit(1);
}

debugAuth(userId, password);