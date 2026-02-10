const axios = require('axios');
const { baseURL, testUser, testAdmin } = require('./test-config');

console.log('🧪 PHASE 2: Authentication Tests\n');

let userToken = null;
let adminToken = null;

async function testUserRegistration() {
  console.log('1️⃣ Testing User Registration...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/register`, {
      name: testUser.name,
      userId: 'testuser123',
      email: testUser.email,
      password: testUser.password,
      companyCode: 'TESTCOMPANY'
    });
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ User registration successful');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 400 && 
        (error.response?.data?.message?.includes('already') || 
         error.response?.data?.message?.includes('in use'))) {
      console.log('✅ User already exists (OK for testing)');
      return true;
    }
    console.log('❌ User registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n2️⃣ Testing User Login...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/login`, {
      userId: testUser.email,
      password: testUser.password
    });
    
    if (response.data.token) {
      userToken = response.data.token;
      console.log('✅ User login successful');
      console.log('   Token received:', userToken.substring(0, 20) + '...');
      return true;
    }
  } catch (error) {
    console.log('❌ User login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAdminRegistration() {
  console.log('\n3️⃣ Testing Admin Registration...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/admin/register`, {
      name: testAdmin.name,
      userId: 'testadmin123',
      email: testAdmin.email,
      password: testAdmin.password,
      company: 'TESTCOMPANY'
    });
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Admin registration successful');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 400 && 
        (error.response?.data?.message?.includes('already') || 
         error.response?.data?.message?.includes('in use'))) {
      console.log('✅ Admin already exists (OK for testing)');
      return true;
    }
    console.log('❌ Admin registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAdminLogin() {
  console.log('\n4️⃣ Testing Admin Login...');
  try {
    const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
      userId: testAdmin.email,
      password: testAdmin.password
    });
    
    if (response.data.token) {
      adminToken = response.data.token;
      console.log('✅ Admin login successful');
      console.log('   Token received:', adminToken.substring(0, 20) + '...');
      return true;
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n5️⃣ Testing Invalid Login (Security)...');
  try {
    await axios.post(`${baseURL}/api/auth/login`, {
      userId: testUser.email,
      password: 'wrongpassword'
    });
    console.log('❌ Invalid login should have failed');
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      console.log('✅ Invalid login correctly rejected');
      return true;
    }
    console.log('⚠️  Unexpected error:', error.message);
    return false;
  }
}

async function runPhase2() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    userReg: await testUserRegistration(),
    userLogin: await testUserLogin(),
    adminReg: await testAdminRegistration(),
    adminLogin: await testAdminLogin(),
    invalidLogin: await testInvalidLogin()
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 PHASE 2 RESULTS:');
  console.log(`   User Registration: ${results.userReg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   User Login: ${results.userLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Admin Registration: ${results.adminReg ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Admin Login: ${results.adminLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Invalid Login: ${results.invalidLogin ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n   Overall: ${allPassed ? '✅ PHASE 2 PASSED' : '❌ PHASE 2 FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return { success: allPassed, tokens: { userToken, adminToken } };
}

if (require.main === module) {
  runPhase2().then(result => process.exit(result.success ? 0 : 1));
}

module.exports = { runPhase2 };
