const axios = require('axios');
const { baseURL, testUser, testAdmin } = require('./test-config');

console.log('🧪 TASK VISIBILITY TEST\n');

let adminToken = null;
let user1Token = null;
let user1Id = null;
let adminId = null;
let taskId = null;

// Create second test user
const testUser2 = {
  email: 'testuser2@example.com',
  password: 'Test@123456',
  name: 'Test User 2'
};
let user2Token = null;
let user2Id = null;

async function loginAdmin() {
  const response = await axios.post(`${baseURL}/api/auth/admin/login`, {
    userId: testAdmin.email,
    password: testAdmin.password
  });
  adminToken = response.data.token;
  adminId = response.data.user?._id || response.data.user?.id;
  console.log('✅ Admin logged in (ID:', adminId, ')\n');
}

async function loginUser1() {
  const response = await axios.post(`${baseURL}/api/auth/login`, {
    userId: testUser.email,
    password: testUser.password
  });
  user1Token = response.data.token;
  user1Id = response.data.user?._id || response.data.user?.id;
  console.log('✅ User 1 logged in (ID:', user1Id, ')\n');
}

async function createUser2() {
  try {
    await axios.post(`${baseURL}/api/auth/register`, {
      name: testUser2.name,
      userId: 'testuser2',
      email: testUser2.email,
      password: testUser2.password,
      companyCode: 'TESTCOMPANY'
    });
    console.log('✅ User 2 created\n');
  } catch (error) {
    console.log('⚠️  User 2 already exists\n');
  }
  
  // Approve user 2
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  await supabase
    .from('users')
    .update({ account_status: 'active' })
    .eq('email', testUser2.email);
  
  console.log('✅ User 2 approved\n');
}

async function loginUser2() {
  const response = await axios.post(`${baseURL}/api/auth/login`, {
    userId: testUser2.email,
    password: testUser2.password
  });
  user2Token = response.data.token;
  user2Id = response.data.user?._id || response.data.user?.id;
  console.log('✅ User 2 logged in (ID:', user2Id, ')\n');
}

async function testScenario1() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('SCENARIO 1: Admin assigns task to User 1 and User 2');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Admin creates task and assigns to User 1 and User 2
  const response = await axios.post(`${baseURL}/api/tasks`, {
    title: 'Visibility Test Task',
    description: 'Testing visibility rules',
    assignedTo: [user1Id, user2Id],
    priority: 3,
    company: 'TESTCOMPANY'
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  
  taskId = response.data.task.id;
  console.log('✅ Admin created task (ID:', taskId, ') assigned to User 1 and User 2\n');
  
  // Check Admin's view
  const adminTasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminSeesTask = adminTasks.data.find(t => t.id === taskId);
  console.log('Admin view:');
  console.log('  - Can see task:', adminSeesTask ? '✅ YES' : '❌ NO');
  if (adminSeesTask) {
    const assignees = Array.isArray(adminSeesTask.assignedTo) ? adminSeesTask.assignedTo : [adminSeesTask.assignedTo];
    console.log('  - Sees assignees:', assignees.map(a => a.name).join(', '));
  }
  console.log();
  
  // Check User 1's view
  const user1Tasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  const user1SeesTask = user1Tasks.data.find(t => t.id === taskId);
  console.log('User 1 view:');
  console.log('  - Can see task:', user1SeesTask ? '✅ YES' : '❌ NO');
  if (user1SeesTask) {
    const assignees = Array.isArray(user1SeesTask.assignedTo) ? user1SeesTask.assignedTo : [user1SeesTask.assignedTo];
    console.log('  - Sees assignees:', assignees.map(a => a.name).join(', '));
    console.log('  - Knows about User 2:', assignees.some(a => a.name === 'Test User 2') ? '❌ YES (WRONG!)' : '✅ NO (CORRECT!)');
  }
  console.log();
  
  // Check User 2's view
  const user2Tasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  const user2SeesTask = user2Tasks.data.find(t => t.id === taskId);
  console.log('User 2 view:');
  console.log('  - Can see task:', user2SeesTask ? '✅ YES' : '❌ NO');
  if (user2SeesTask) {
    const assignees = Array.isArray(user2SeesTask.assignedTo) ? user2SeesTask.assignedTo : [user2SeesTask.assignedTo];
    console.log('  - Sees assignees:', assignees.map(a => a.name).join(', '));
    console.log('  - Knows about User 1:', assignees.some(a => a.name === 'Test User') ? '❌ YES (WRONG!)' : '✅ NO (CORRECT!)');
  }
  console.log();
  
  return {
    adminSees: !!adminSeesTask,
    user1Sees: !!user1SeesTask,
    user2Sees: !!user2SeesTask,
    user1KnowsUser2: user1SeesTask ? (Array.isArray(user1SeesTask.assignedTo) ? user1SeesTask.assignedTo : [user1SeesTask.assignedTo]).some(a => a.name === 'Test User 2') : false,
    user2KnowsUser1: user2SeesTask ? (Array.isArray(user2SeesTask.assignedTo) ? user2SeesTask.assignedTo : [user2SeesTask.assignedTo]).some(a => a.name === 'Test User') : false
  };
}

async function testScenario2() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('SCENARIO 2: User 1 assigns task to User 2');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // User 1 creates task and assigns to User 2
  const response = await axios.post(`${baseURL}/api/tasks`, {
    title: 'User to User Task',
    description: 'User 1 assigns to User 2',
    assignedTo: [user2Id],
    priority: 3,
    company: 'TESTCOMPANY'
  }, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  
  const taskId2 = response.data.task.id;
  console.log('✅ User 1 created task (ID:', taskId2, ') assigned to User 2\n');
  
  // Check Admin's view
  const adminTasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminSeesTask = adminTasks.data.find(t => t.id === taskId2);
  console.log('Admin view:');
  console.log('  - Can see task:', adminSeesTask ? '❌ YES (WRONG!)' : '✅ NO (CORRECT!)');
  console.log();
  
  // Check User 1's view
  const user1Tasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  const user1SeesTask = user1Tasks.data.find(t => t.id === taskId2);
  console.log('User 1 (creator) view:');
  console.log('  - Can see task:', user1SeesTask ? '✅ YES' : '❌ NO');
  console.log();
  
  // Check User 2's view
  const user2Tasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  const user2SeesTask = user2Tasks.data.find(t => t.id === taskId2);
  console.log('User 2 (assignee) view:');
  console.log('  - Can see task:', user2SeesTask ? '✅ YES' : '❌ NO');
  console.log();
  
  return {
    adminSees: !!adminSeesTask,
    user1Sees: !!user1SeesTask,
    user2Sees: !!user2SeesTask
  };
}

async function runVisibilityTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         TASK VISIBILITY VERIFICATION TEST            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  await loginAdmin();
  await loginUser1();
  await createUser2();
  await loginUser2();
  
  const scenario1 = await testScenario1();
  const scenario2 = await testScenario2();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Scenario 1 (Admin → User 1, User 2):');
  console.log('  ✅ Admin sees task:', scenario1.adminSees ? 'PASS' : 'FAIL');
  console.log('  ✅ User 1 sees task:', scenario1.user1Sees ? 'PASS' : 'FAIL');
  console.log('  ✅ User 2 sees task:', scenario1.user2Sees ? 'PASS' : 'FAIL');
  console.log('  ✅ User 1 doesn\'t know User 2:', !scenario1.user1KnowsUser2 ? 'PASS' : 'FAIL');
  console.log('  ✅ User 2 doesn\'t know User 1:', !scenario1.user2KnowsUser1 ? 'PASS' : 'FAIL');
  console.log();
  
  console.log('Scenario 2 (User 1 → User 2):');
  console.log('  ✅ Admin doesn\'t see task:', !scenario2.adminSees ? 'PASS' : 'FAIL');
  console.log('  ✅ User 1 sees task:', scenario2.user1Sees ? 'PASS' : 'FAIL');
  console.log('  ✅ User 2 sees task:', scenario2.user2Sees ? 'PASS' : 'FAIL');
  console.log();
  
  const allPassed = 
    scenario1.adminSees &&
    scenario1.user1Sees &&
    scenario1.user2Sees &&
    !scenario1.user1KnowsUser2 &&
    !scenario1.user2KnowsUser1 &&
    !scenario2.adminSees &&
    scenario2.user1Sees &&
    scenario2.user2Sees;
  
  console.log('═══════════════════════════════════════════════════════');
  console.log(allPassed ? '✅ ALL VISIBILITY TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('═══════════════════════════════════════════════════════\n');
  
  return allPassed;
}

if (require.main === module) {
  runVisibilityTests().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runVisibilityTests };
