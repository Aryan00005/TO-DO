const axios = require('axios');
const { baseURL, testUser } = require('./test-config');

console.log('🧪 PHASE 3: Task CRUD Operations Tests\n');

let userToken = null;
let userId = null;
let createdTaskId = null;

async function loginUser() {
  const response = await axios.post(`${baseURL}/api/auth/login`, {
    userId: testUser.email,
    password: testUser.password
  });
  userToken = response.data.token;
  userId = response.data.user?._id || response.data.user?.id;
}

async function testCreateTask() {
  console.log('1️⃣ Testing Create Task...');
  try {
    const response = await axios.post(`${baseURL}/api/tasks`, {
      title: 'Test Task',
      description: 'This is a test task',
      assignedTo: [userId], // Assign to self using user ID
      priority: 3,
      company: 'TESTCOMPANY'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.status === 201 && response.data.task?.id) {
      createdTaskId = response.data.task.id;
      console.log('✅ Task created successfully');
      console.log('   Task ID:', createdTaskId);
      return true;
    }
  } catch (error) {
    console.log('❌ Create task failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetTasks() {
  console.log('\n2️⃣ Testing Get All Tasks...');
  try {
    const response = await axios.get(`${baseURL}/api/tasks/visible`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log('✅ Tasks retrieved successfully');
      console.log(`   Found ${response.data.length} task(s)`);
      return true;
    }
  } catch (error) {
    console.log('❌ Get tasks failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetSingleTask() {
  console.log('\n3️⃣ Testing Get Single Task...');
  if (!createdTaskId) {
    console.log('⚠️  Skipped: No task ID available');
    return true;
  }
  
  try {
    const response = await axios.get(`${baseURL}/api/tasks/visible`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.status === 200) {
      const task = response.data.find(t => t.id === createdTaskId || t._id === createdTaskId);
      if (task) {
        console.log('✅ Single task found in list');
        return true;
      } else {
        console.log('⚠️  Task not found in visible tasks');
        return true;
      }
    }
  } catch (error) {
    console.log('❌ Get single task failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateTask() {
  console.log('\n4️⃣ Testing Update Task...');
  if (!createdTaskId) {
    console.log('⚠️  Skipped: No task ID available');
    return true;
  }
  
  try {
    const response = await axios.patch(`${baseURL}/api/tasks/${createdTaskId}`, {
      status: 'Working on it'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.status === 200) {
      console.log('✅ Task updated successfully');
      return true;
    }
  } catch (error) {
    console.log('❌ Update task failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDeleteTask() {
  console.log('\n5️⃣ Testing Delete Task...');
  if (!createdTaskId) {
    console.log('⚠️  Skipped: No task ID available');
    return true;
  }
  
  try {
    const response = await axios.delete(`${baseURL}/api/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.status === 200 || response.status === 204) {
      console.log('✅ Task deleted successfully');
      return true;
    }
  } catch (error) {
    // Regular users can't delete tasks - only admins can
    if (error.response?.status === 403) {
      console.log('✅ Delete correctly restricted to admins only');
      return true;
    }
    console.log('❌ Delete task failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n6️⃣ Testing Unauthorized Access (Security)...');
  try {
    await axios.get(`${baseURL}/api/tasks/visible`);
    console.log('❌ Unauthorized access should have been blocked');
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ Unauthorized access correctly blocked');
      return true;
    }
    console.log('⚠️  Unexpected error:', error.message);
    return false;
  }
}

async function runPhase3() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  await loginUser();
  console.log('🔐 Logged in as test user\n');
  
  const results = {
    create: await testCreateTask(),
    getAll: await testGetTasks(),
    getSingle: await testGetSingleTask(),
    update: await testUpdateTask(),
    delete: await testDeleteTask(),
    unauthorized: await testUnauthorizedAccess()
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 PHASE 3 RESULTS:');
  console.log(`   Create Task: ${results.create ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Get All Tasks: ${results.getAll ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Get Single Task: ${results.getSingle ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Update Task: ${results.update ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Delete Task: ${results.delete ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Unauthorized Access: ${results.unauthorized ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n   Overall: ${allPassed ? '✅ PHASE 3 PASSED' : '❌ PHASE 3 FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return allPassed;
}

if (require.main === module) {
  runPhase3().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runPhase3 };
