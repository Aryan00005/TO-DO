import { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

interface Task {
  _id: string;
  title: string;
  status: 'not-started' | 'in-progress' | 'stuck' | 'completed';
  userId: string;
}

const SuperAdminView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/superadmin/users-tasks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(response.data.users);
        setTasks(response.data.tasks);
      } catch (error) {
        console.error('Failed to fetch superadmin data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2>Superadmin Dashboard</h2>
      <div>
        <h3>Users ({users.length})</h3>
        <ul>
          {users.map(user => (
            <li key={user._id}>{user.username} ({user.role})</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>All Tasks ({tasks.length})</h3>
        {/* Reuse your existing analytics/task status components here */}
      </div>
    </div>
  );
};

export default SuperAdminView;
