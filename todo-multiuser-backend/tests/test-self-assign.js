const axios = require('axios');

const baseURL = 'https://to-do-1-26zv.onrender.com';

async function testSelfAssignedTask() {
  console.log('🧪 Testing Self-Assigned Task Visibility\n');

  // Login as test2
  const login = await axios.post(`${baseURL}/api/auth/login`, {
    userId: 'test2',
    password: 'test123'
  });

  const token = login.data.token;
  const userId = login.data.user._id || login.data.user.id;

  console.log('✅ Logged in as test2 (ID:', userId, ')\n');

  // Create task assigned to self
  const createTask = await axios.post(`${baseURL}/api/tasks`, {
    title: 'Self-Assigned Task Test',
    description: 'Testing if self-assigned tasks are visible',
    assignedTo: [userId],  // Assign to self
    priority: 3,
    company: 'testing'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const taskId = createTask.data.task.id;
  console.log('✅ Created self-assigned task (ID:', taskId, ')\n');

  // Get visible tasks
  const visibleTasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const foundTask = visibleTasks.data.find(t => t.id === taskId);

  console.log('📋 Total visible tasks:', visibleTasks.data.length);
  console.log('🔍 Self-assigned task visible:', foundTask ? '✅ YES' : '❌ NO');

  if (foundTask) {
    console.log('\n✅ SUCCESS! Self-assigned task is visible on kanban board');
    console.log('   Task:', foundTask.title);
    console.log('   Assigned to:', foundTask.assignedTo?.name || 'N/A');
  } else {
    console.log('\n❌ FAILED! Self-assigned task is NOT visible');
  }
}

testSelfAssignedTask().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});
