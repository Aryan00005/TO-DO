const axios = require('axios');

const baseURL = 'http://localhost:5500';

async function quickTest() {
  // Login as User 1
  const user1 = await axios.post(`${baseURL}/api/auth/login`, {
    userId: 'test@example.com',
    password: 'Test@123456'
  });
  
  console.log('User 1 ID:', user1.data.user._id);
  
  // Get tasks for User 1
  const tasks = await axios.get(`${baseURL}/api/tasks/visible`, {
    headers: { Authorization: `Bearer ${user1.data.token}` }
  });
  
  console.log('\nUser 1 sees', tasks.data.length, 'tasks');
  
  // Check first task
  if (tasks.data.length > 0) {
    const task = tasks.data[0];
    console.log('\nFirst task:');
    console.log('  ID:', task.id);
    console.log('  Title:', task.title);
    console.log('  Created by:', task.assignedBy?.name);
    console.log('  Assigned to:', Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a.name).join(', ') : task.assignedTo?.name);
  }
}

quickTest().catch(console.error);
