import React, { useEffect, useState } from "react";
import { FaColumns, FaMoon, FaSignOutAlt, FaSun } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import axios from "../api/axios";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  assignedTo: string | any;
  assignedBy?: string | any;
  priority: number;
  dueDate?: string;
  company?: string;
  stuckReason?: string;
  completionRemark?: string;
}

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [nav, setNav] = useState("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  if (!user) return <div>Loading...</div>;

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        console.log('🔄 Fetching tasks for user:', user._id);
        const token = sessionStorage.getItem("jwt-token");
        console.log('🔑 Token exists:', !!token);
        
        const res = await axios.get(`/tasks/assignedToOnly/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📦 Raw API response:', res.data);
        console.log('📊 Number of tasks received:', res.data.length);
        
        const processedTasks = res.data.map((task: any) => {
          console.log('🔍 Processing task:', task);
          return {
            _id: task.id || task._id,
            title: task.title,
            description: task.description,
            status: task.status || 'Not Started',
            assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0] : task.assignedTo,
            assignedBy: task.assignedBy,
            priority: task.priority || 1,
            dueDate: task.due_date || task.dueDate,
            company: task.company,
            stuckReason: task.stuck_reason || task.stuckReason || ''
          };
        });
        
        console.log('✅ Processed tasks:', processedTasks);
        setTasks(processedTasks);
      } catch (err) {
        console.error('❌ Fetch error:', err);
      }
    };
    
    fetchTasks();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [user._id]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', background: theme === 'dark' ? '#374151' : '#fff', borderRight: '1px solid #e5e7eb', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 12px' }}>
            {getInitials(user.name)}
          </div>
          <div style={{ fontWeight: '600', fontSize: '18px', color: theme === 'dark' ? '#fff' : '#1f2937' }}>{user.name}</div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>{user.email}</div>
        </div>
        
        <div style={{ padding: '16px 0' }}>
          <div onClick={() => setNav('kanban')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', margin: '4px 12px', cursor: 'pointer', background: nav === 'kanban' ? '#3b82f6' : 'transparent', color: nav === 'kanban' ? '#fff' : (theme === 'dark' ? '#d1d5db' : '#4b5563'), borderRadius: '12px' }}>
            <FaColumns size={16} />
            <span>Tasks Board</span>
          </div>
        </div>
        
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', position: 'absolute', bottom: 0, width: '100%' }}>
          <div onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', color: '#ef4444', fontWeight: '600', borderRadius: '12px' }}>
            <FaSignOutAlt size={16} />
            <span>Logout</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: '280px' }}>
        <div style={{ background: theme === 'dark' ? '#374151' : '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: theme === 'dark' ? '#fff' : '#1f2937', margin: 0 }}>Task Management System</h1>
          <button onClick={toggleTheme} style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', border: 'none', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme === 'dark' ? '#fbbf24' : '#3b82f6' }}>
            {theme === 'light' ? <FaMoon size={22} /> : <FaSun size={22} />}
          </button>
        </div>
        
        <div style={{ padding: '32px' }}>
          {/* DEBUG BANNER */}
          <div style={{ background: 'red', color: 'white', padding: '20px', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
            🔴 FIXED FILE LOADED | Tasks: {tasks.length} | User: {user._id}
          </div>
          
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: theme === 'dark' ? '#374151' : '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{totalTasks}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
            </div>
            <div style={{ background: theme === 'dark' ? '#374151' : '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{doneTasks}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Done</div>
            </div>
            <div style={{ background: theme === 'dark' ? '#374151' : '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{inProgressTasks}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>In Progress</div>
            </div>
            <div style={{ background: theme === 'dark' ? '#374151' : '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{stuckTasks}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Stuck</div>
            </div>
          </div>
          
          {/* Kanban Board */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {["Not Started", "Working on it", "Stuck", "Done"].map(col => (
              <div key={col} style={{ background: theme === 'dark' ? '#374151' : '#fff', borderRadius: '12px', padding: '20px', minHeight: '500px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ fontWeight: 'bold', color: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {col}
                  <span style={{ background: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e', color: '#fff', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
                    {tasks.filter(task => task.status === col).length}
                  </span>
                </div>
                
                {tasks.filter(task => task.status === col).map((task) => (
                  <div key={task._id} style={{ background: theme === 'dark' ? '#4b5563' : '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>{task.title}</div>
                    <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px', marginBottom: '8px' }}>{task.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Priority: {task.priority}</span>
                      {task.dueDate && <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
                
                {tasks.filter(task => task.status === col).length === 0 && (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No tasks</div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <ToastContainer />
      </div>
    </div>
  );
};

export default Dashboard;
