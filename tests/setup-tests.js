const axios = require('axios');
const { baseURL, testAdmin, testUser, testSuperAdmin } = require('./test-config');

console.log('🔧 Setting up test environment...\n');

let superAdminToken = null;
let testAdminId = null;

async function loginSuperAdmin() {
  console.log('1️⃣ Logging in as Super Admin...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
      userId: testSuperAdmin.email,
      password: testSuperAdmin.password
    });
    superAdminToken = response.data.token;
    console.log('✅ Super Admin logged in successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Super Admin login failed:', error.response?.data?.message || error.message);
    console.log('⚠️  Make sure super admin exists. Run: node scripts/setup-super-admin.js\n');
    return false;
  }
}

async function getPendingAdmins() {
  console.log('2️⃣ Getting pending admin requests...');
  try {
    const response = await axios.get(`${baseURL}/api/superadmin/pending-admins`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    
    const pendingAdmins = response.data;
    console.log(`✅ Found ${pendingAdmins.length} pending admin(s)\n`);
    
    // Find our test admin
    const testAdminPending = pendingAdmins.find(admin => admin.email === testAdmin.email);
    if (testAdminPending) {
      testAdminId = testAdminPending.id;
      console.log(`   Test admin found: ${testAdminPending.name} (${testAdminPending.email})`);
      return true;
    } else {
      console.log('   Test admin not found in pending list');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to get pending admins:', error.response?.data || error.message);
    return false;
  }
}

async function approveTestAdmin() {
  console.log('\n3️⃣ Approving test admin...');
  try {
    const response = await axios.post(`${baseURL}/api/superadmin/admin-action`, {
      adminId: testAdminId,
      action: 'approve'
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    
    console.log('✅ Test admin approved successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Failed to approve admin:', error.response?.data || error.message);
    return false;
  }
}

async function verifyAdminLogin() {
  console.log('4️⃣ Verifying admin can now login...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
      userId: testAdmin.email,
      password: testAdmin.password
    });
    
    if (response.data.token) {
      console.log('✅ Admin login successful after approval\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Admin login still failing:', error.response?.data || error.message);
    return false;
  }
}

async function setup() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  const superAdminLoggedIn = await loginSuperAdmin();
  if (!superAdminLoggedIn) {
    console.log('\n❌ Setup failed: Cannot proceed without super admin');
    console.log('\n💡 To create super admin, run:');
    console.log('   node scripts/setup-super-admin.js');
    return false;
  }
  
  const foundPendingAdmin = await getPendingAdmins();
  if (!foundPendingAdmin) {
    console.log('\n⚠️  No pending test admin found');
    console.log('   This is OK if admin is already approved');
    console.log('   Or run Phase 2 tests first to create the admin\n');
    return true;
  }
  
  const approved = await approveTestAdmin();
  if (!approved) {
    return false;
  }
  
  const verified = await verifyAdminLogin();
  
  console.log('═══════════════════════════════════════════════════════');
  if (verified) {
    console.log('✅ Test environment setup complete!');
    console.log('\n   You can now run the full test suite:');
    console.log('   npm test\n');
  } else {
    console.log('⚠️  Setup partially complete but verification failed\n');
  }
  console.log('═══════════════════════════════════════════════════════\n');
  
  return verified;
}

if (require.main === module) {
  setup().then(success => process.exit(success ? 0 : 1));
}

module.exports = { setup };
