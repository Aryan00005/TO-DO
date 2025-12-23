import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaColumns, FaMoon, FaPlus, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaEdit, FaTrash, FaQuestionCircle, FaCheckCircle } from "react-icons/fa";
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
  const [users, setUsers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState(5);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [stuckTaskId, setStuckTaskId] = useState('');
  const [stuckReason, setStuckReason] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const today = new Date();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 13 }, (_, i) => currentYear - 1 + i);

  if (!user) return <div>Loading...</div>;

  useEffect(() => {
    const token = sessionStorage.getItem("jwt-token");
    axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data))
      .catch(() => setUsers([user]));
  }, []);

  useEffect(() => {
    if (nav === "assignedtasks") {
      axios.get(`/tasks/assignedBy/${user._id}`)
        .then(res => {
          const processedTasks = res.data.map((task: any) => {
            const firstAssigneeId = Array.isArray(task.assignedTo) ? task.assignedTo[0]._id || task.assignedTo[0] : task.assignedTo._id || task.assignedTo;
            const assigneeStatus = task.assigneeStatuses?.find((s: any) => s.user.toString() === firstAssigneeId || s.user._id === firstAssigneeId);
            return {
              ...task,
              status: assigneeStatus?.status || task.status || 'Not Started',
              stuckReason: assigneeStatus?.completionRemark || task.stuckReason || ''
            };
          });
          setAssignedTasks(processedTasks);
        })
        .catch(err => console.error(err));
    }
  }, [nav, user._id]);

  useEffect(() => {
    axios.get(`/tasks/assignedTo/${user._id}`)
      .then(res => {
        const processedTasks = res.data.map((task: any) => {
          const userAssignment = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user === user._id);
          return {
            ...task,
            status: userAssignment?.status || 'Not Started',
            stuckReason: userAssignment?.completionRemark || ''
          };
        });
        setTasks(processedTasks);
      })
      .catch(err => console.error(err));
  }, [user._id]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = sessionStorage.getItem("jwt-token");
        const res = await axios.get(`/notifications/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
  }, [user._id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && !(event.target as Element).closest('[data-notifications-panel]')) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // ESC key to close modals
      if (event.key === 'Escape') {
        if (showEditModal) {
          setShowEditModal(false);
          setEditingTask(null);
          setTitle(""); setDescription(""); setAssignedTo(""); setPriority(5); setDueDate(""); setCompany("");
        }
        if (showStuckModal) {
          setShowStuckModal(false);
          setStuckReason('');
          setStuckTaskId('');
        }
        if (showNotifications) {
          setShowNotifications(false);
        }
        if (showHelp) {
          setShowHelp(false);
        }
      }
      
      // Ctrl/Cmd + N to create new task
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        setNav('assigntasks');
      }
      
      // Number keys to switch views (only when not typing in input fields)
      if (event.key >= '1' && event.key <= '7' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
        
        if (!isTyping) {
          const views = ['profile', 'kanban', 'assigntasks', 'list', 'completed', 'calendar', 'analytics'];
          const index = parseInt(event.key) - 1;
          if (views[index]) {
            setNav(views[index]);
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showEditModal, showStuckModal, showNotifications, showHelp]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !assignedTo || !dueDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      const token = sessionStorage.getItem("jwt-token");
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: [assignedTo],
        priority,
        dueDate,
        company: company.trim() || undefined
      };
      
      await axios.post("/tasks", taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTitle(""); setDescription(""); setAssignedTo(""); setPriority(5); setDueDate(""); setCompany("");
      
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      const processedTasks = res.data.map((task: any) => {
        const userAssignment = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user === user._id);
        return {
          ...task,
          status: userAssignment?.status || 'Not Started',
          stuckReason: userAssignment?.completionRemark || ''
        };
      });
      setTasks(processedTasks);
      
      showToast("Task created successfully!", "success");
      setNav("kanban");
    } catch (err: any) {
      console.error("Task creation error:", err.response?.data);
      showToast("Error: " + (err.response?.data?.message || "Failed to create task"), "error");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, remark?: string) => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      const payload: any = { status: newStatus };
      if (remark) payload.remark = remark;
      
      await axios.patch(`/tasks/${taskId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Force refresh tasks from server
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      const processedTasks = res.data.map((task: any) => {
        const userAssignment = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user === user._id);
        return {
          ...task,
          status: userAssignment?.status || 'Not Started',
          stuckReason: userAssignment?.completionRemark || ''
        };
      });
      setTasks(processedTasks);
      
      setRefreshKey(prev => prev + 1);
      showToast(`Task moved to ${newStatus}!`, "success");
    } catch (err) {
      showToast("Failed to update task", "error");
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (taskId) {
      if (newStatus === 'Stuck') {
        setStuckTaskId(taskId);
        setShowStuckModal(true);
      } else {
        updateTaskStatus(taskId, newStatus);
      }
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleStuckSubmit = () => {
    if (stuckReason.trim()) {
      updateTaskStatus(stuckTaskId, 'Stuck', stuckReason.trim());
      setShowStuckModal(false);
      setStuckReason('');
      setStuckTaskId('');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setCompany(task.company || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setAssignedTo(typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask || !title.trim() || !description.trim() || !assignedTo || !dueDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      const token = sessionStorage.getItem("jwt-token");
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: [assignedTo],
        priority,
        dueDate,
        company: company.trim() || undefined
      };
      
      await axios.put(`/tasks/${editingTask._id}`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Reset form
      setTitle(""); setDescription(""); setAssignedTo(""); setPriority(5); setDueDate(""); setCompany("");
      setEditingTask(null);
      setShowEditModal(false);
      
      // Refresh tasks
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      const processedTasks = res.data.map((task: any) => {
        const userAssignment = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user === user._id);
        return {
          ...task,
          status: userAssignment?.status || 'Not Started',
          stuckReason: userAssignment?.completionRemark || ''
        };
      });
      setTasks(processedTasks);
      
      showToast("Task updated successfully!", "success");
    } catch (err: any) {
      console.error("Task update error:", err.response?.data);
      showToast("Error: " + (err.response?.data?.message || "Failed to update task"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove task from state
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      showToast("Task deleted successfully!", "success");
    } catch (err: any) {
      console.error("Task deletion error:", err.response?.data);
      showToast("Error: " + (err.response?.data?.message || "Failed to delete task"), "error");
    }
  };

  const renderStars = (value: number, onClick?: (v: number) => void) => {
    const getStarColor = (starIndex: number, currentValue: number) => {
      if (starIndex > currentValue) return "#e5e7eb";
      if (currentValue === 1) return "#22c55e";
      if (currentValue === 2) return "#eab308";
      if (currentValue === 3) return "#f59e0b";
      if (currentValue === 4) return "#fb7185";
      return "#ef4444";
    };
    
    return (
      <span>
        {[1, 2, 3, 4, 5].map(star => (
          <FaStar
            key={star}
            color={getStarColor(star, value)}
            style={{ cursor: onClick ? "pointer" : "default", marginRight: 2 }}
            onClick={onClick ? () => onClick(star) : undefined}
          />
        ))}
      </span>
    );
  };

  // Calculate stats dynamically
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  let content = null;

  if (nav === "profile") {
    content = (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '32px' }}>
            Profile Information
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '36px',
              fontWeight: 'bold'
            }}>
              {getInitials(user.name)}
            </div>
            
            <div>
              <h3 style={{ fontSize: '28px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
                {user.name}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '4px' }}>{user.email}</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Role: {user.role || 'User'}</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{
              background: theme === 'dark' ? '#4b5563' : '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                {totalTasks}
              </div>
              <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>Total Tasks</div>
            </div>
            
            <div style={{
              background: theme === 'dark' ? '#4b5563' : '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                {doneTasks}
              </div>
              <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>Completed</div>
            </div>
            
            <div style={{
              background: theme === 'dark' ? '#4b5563' : '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                {inProgressTasks}
              </div>
              <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>In Progress</div>
            </div>
            
            <div style={{
              background: theme === 'dark' ? '#4b5563' : '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                {stuckTasks}
              </div>
              <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>Stuck Tasks</div>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (nav === "list") {
    content = (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Task List
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: theme === 'dark' ? '#4b5563' : '#fff',
                color: theme === 'dark' ? '#fff' : '#1f2937',
                minWidth: '200px'
              }}
            />
            <select 
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: theme === 'dark' ? '#4b5563' : '#fff',
                color: theme === 'dark' ? '#fff' : '#1f2937'
              }}
            >
              <option value="all">All Tasks</option>
              <option value="Not Started">Not Started</option>
              <option value="Working on it">Working on it</option>
              <option value="Stuck">Stuck</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              No tasks found
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 120px 120px 100px',
                gap: '16px',
                padding: '16px 24px',
                background: theme === 'dark' ? '#4b5563' : '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '600',
                fontSize: '14px',
                color: theme === 'dark' ? '#d1d5db' : '#6b7280'
              }}>
                <div>TASK</div>
                <div>ASSIGNEE</div>
                <div>PRIORITY</div>
                <div>STATUS</div>
                <div>DUE DATE</div>
              </div>
              
              {/* Tasks */}
              {(() => {
                const filteredTasks = tasks
                  .filter(task => taskFilter === 'all' || task.status === taskFilter)
                  .filter(task => 
                    searchTerm === '' || 
                    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    task.description.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                
                return filteredTasks.map((task, index) => (
                <div
                  key={task._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 120px 120px 100px',
                    gap: '16px',
                    padding: '16px 24px',
                    borderBottom: index < filteredTasks.length - 1 ? '1px solid #e5e7eb' : 'none',
                    background: theme === 'dark' ? '#374151' : '#fff',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '4px' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}
                    </div>
                  </div>
                  
                  <div style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>
                    {typeof task.assignedTo === 'object' ? task.assignedTo.name : 'Unknown'}
                  </div>
                  
                  <div>
                    {renderStars(task.priority)}
                  </div>
                  
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: task.status === 'Done' ? '#dcfce7' : task.status === 'Working on it' ? '#fef3c7' : task.status === 'Stuck' ? '#fee2e2' : '#f1f5f9',
                      color: task.status === 'Done' ? '#166534' : task.status === 'Working on it' ? '#92400e' : task.status === 'Stuck' ? '#991b1b' : '#475569'
                    }}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                  </div>
                </div>
              ));
              })()}}
            </div>
          )}
        </div>
      </div>
    );
  } else if (nav === "completed") {
    const completedTasks = tasks.filter(task => task.status === 'Done');
    
    content = (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Completed Tasks ({completedTasks.length})
          </h2>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          {completedTasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              No completed tasks yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '24px' }}>
              {completedTasks.map((task) => (
                <div
                  key={task._id}
                  style={{
                    background: theme === 'dark' ? '#4b5563' : '#f9fafb',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    color: '#10b981',
                    fontSize: '20px'
                  }}>
                    <FaCheckCircle />
                  </div>
                  
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: theme === 'dark' ? '#fff' : '#1f2937',
                    marginBottom: '8px',
                    paddingRight: '30px'
                  }}>
                    {task.title}
                  </div>
                  
                  <div style={{ 
                    color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}>
                    {task.description}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Priority:</span>
                      {renderStars(task.priority)}
                    </div>
                    {task.dueDate && (
                      <div style={{ 
                        color: '#6b7280',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <FaCalendar style={{ marginRight: '4px' }} />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ✅ Completed
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (nav === "calendar") {
    const getTasksForDate = (date: number) => {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === dateStr;
      });
    };
    
    content = (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Calendar View
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: theme === 'dark' ? '#4b5563' : '#fff',
                color: theme === 'dark' ? '#fff' : '#1f2937'
              }}
            >
              {monthNames.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: theme === 'dark' ? '#4b5563' : '#fff',
                color: theme === 'dark' ? '#fff' : '#1f2937'
              }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          {/* Calendar Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '16px'
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{
                padding: '12px',
                textAlign: 'center',
                fontWeight: '600',
                color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                fontSize: '14px'
              }}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px'
          }}>
            {/* Empty days */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} style={{ height: '100px' }} />
            ))}
            
            {/* Calendar dates */}
            {calendarDates.map(date => {
              const dayTasks = getTasksForDate(date);
              const isToday = today.getDate() === date && today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
              
              return (
                <div
                  key={date}
                  style={{
                    minHeight: '100px',
                    padding: '8px',
                    background: theme === 'dark' ? '#4b5563' : '#f9fafb',
                    border: isToday ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontWeight: isToday ? '700' : '600',
                    color: isToday ? '#3b82f6' : (theme === 'dark' ? '#fff' : '#1f2937'),
                    marginBottom: '4px'
                  }}>
                    {date}
                  </div>
                  
                  {dayTasks.slice(0, 3).map((task, index) => (
                    <div
                      key={task._id}
                      style={{
                        fontSize: '10px',
                        padding: '2px 4px',
                        marginBottom: '2px',
                        borderRadius: '3px',
                        background: task.status === 'Done' ? '#dcfce7' : task.status === 'Working on it' ? '#fef3c7' : task.status === 'Stuck' ? '#fee2e2' : '#f1f5f9',
                        color: task.status === 'Done' ? '#166534' : task.status === 'Working on it' ? '#92400e' : task.status === 'Stuck' ? '#991b1b' : '#475569',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div style={{
                      fontSize: '10px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } else if (nav === "kanban") {
    content = (
      <div>
        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{
            background: theme === 'dark' ? '#374151' : '#fff',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{totalTasks}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
          </div>
          <div style={{
            background: theme === 'dark' ? '#374151' : '#fff',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{doneTasks}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Done</div>
          </div>
          <div style={{
            background: theme === 'dark' ? '#374151' : '#fff',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{inProgressTasks}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>In Progress</div>
          </div>
          <div style={{
            background: theme === 'dark' ? '#374151' : '#fff',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{stuckTasks}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Stuck</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', color: theme === 'dark' ? '#fff' : '#000' }}>Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #dbeafe' }}
          >
            <option value="none">None</option>
            <option value="priority">Priority</option>
            <option value="date">Due Date</option>
          </select>
        </div>
        <div key={`kanban-${refreshKey}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {["Not Started", "Working on it", "Stuck", "Done"].map(col => (
            <div
              key={col}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
              style={{
                background: theme === 'dark' ? '#374151' : '#fff',
                borderRadius: '12px',
                padding: '20px',
                minHeight: '500px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                color: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {col}
                <span style={{
                  background: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '12px'
                }}>
                  {tasks.filter(task => task.status === col).length}
                </span>
              </div>
              
              {tasks.filter(task => task.status === col)
                .sort((a, b) => {
                  if (sortBy === 'priority') {
                    return b.priority - a.priority; // Higher priority first
                  } else if (sortBy === 'date') {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }
                  return 0;
                })
                .map((task) => (
                <div
                  key={task._id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() => {
                    const statuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];
                    const currentIndex = statuses.indexOf(task.status);
                    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                    updateTaskStatus(task._id, nextStatus);
                  }}
                  style={{
                    background: theme === 'dark' ? '#4b5563' : '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    cursor: 'grab',
                    opacity: draggedTask === task._id ? 0.5 : 1,
                    transform: draggedTask === task._id ? 'rotate(5deg)' : 'rotate(0deg)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: theme === 'dark' ? '#fff' : '#1f2937',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{task.title}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Edit task"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task._id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete task"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                    color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}>
                    {task.description}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderStars(task.priority)}
                    {task.dueDate && (
                      <div style={{ 
                        color: '#6b7280',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <FaCalendar style={{ marginRight: '4px' }} />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {task.status === 'Stuck' && task.stuckReason && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '6px',
                      padding: '8px',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#ef4444'
                    }}>
                      ⚠️ {task.stuckReason}
                    </div>
                  )}
                </div>
              ))}
              
              {tasks.filter(task => task.status === col).length === 0 && (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                  No tasks
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (nav === "assigntasks") {
    content = (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '32px' }}>
            Create New Task
          </h2>
          
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Company (Optional)
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Assign To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937'
                }}
              >
                <option value="">Select user...</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Priority Level
              </label>
              <div style={{ marginBottom: '8px' }}>
                {renderStars(priority, setPriority)}
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937'
                }}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#9ca3af' : '#3b82f6',
                color: '#fff',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  } else if (nav === "analytics") {
    content = (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '16px', marginBottom: '16px' }}>Total Tasks</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
            {totalTasks}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>All assigned tasks</div>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ color: '#10b981', fontWeight: '600', fontSize: '16px', marginBottom: '16px' }}>Completed</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
            {doneTasks}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% completion rate
          </div>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ color: '#f59e0b', fontWeight: '600', fontSize: '16px', marginBottom: '16px' }}>In Progress</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
            {inProgressTasks}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Currently active</div>
        </div>
        
        <div style={{
          background: theme === 'dark' ? '#374151' : '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '16px', marginBottom: '16px' }}>Stuck</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
            {stuckTasks}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Need attention</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        background: theme === 'dark' ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        boxShadow: theme === 'dark' ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.08)'
      }}>
        {/* Profile Section */}
        <div style={{
          padding: '32px 24px',
          borderBottom: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
          textAlign: 'center',
          background: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 auto 12px auto'
          }}>
            {getInitials(user.name)}
          </div>
          <div style={{ fontWeight: '600', fontSize: '18px', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            {user.name}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>{user.email}</div>
        </div>
        
        {/* Navigation */}
        <div style={{ flex: 1, padding: '16px 0' }}>
          {[
            { key: 'profile', icon: FaUser, label: 'Profile' },
            { key: 'kanban', icon: FaColumns, label: 'Tasks Board' },
            { key: 'assigntasks', icon: FaPlus, label: 'Assign Tasks' },
            { key: 'list', icon: FaTasks, label: 'Task List' },
            { key: 'completed', icon: FaCheckCircle, label: 'Completed Tasks' },
            { key: 'calendar', icon: FaCalendarAlt, label: 'Calendar' },
            { key: 'analytics', icon: FaChartBar, label: 'Analytics' }
          ].map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              onClick={() => setNav(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 24px',
                margin: '4px 12px',
                cursor: 'pointer',
                background: nav === key ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: nav === key ? '#fff' : (theme === 'dark' ? '#d1d5db' : '#4b5563'),
                borderRadius: '12px',
                transition: 'all 0.3s ease'
              }}
            >
              <Icon size={16} />
              <span style={{ fontWeight: nav === key ? '600' : '500' }}>{label}</span>
            </div>
          ))}
        </div>
        
        {/* Logout */}
        <div style={{ padding: '16px 24px', borderTop: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0' }}>
          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              color: '#ef4444',
              fontWeight: '600',
              borderRadius: '12px'
            }}
          >
            <FaSignOutAlt size={16} />
            <span>Logout</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '280px' }}>
        {/* Top Bar */}
        <div style={{
          background: theme === 'dark' ? 'rgba(55, 65, 81, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderBottom: theme === 'dark' ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: theme === 'dark' ? '#ffffff' : '#1f2937',
            margin: 0
          }}>
            Task Management System
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                  position: 'relative'
                }}
              >
                <FaBell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Panel */}
              {showNotifications && (
                <div 
                  data-notifications-panel
                  style={{
                    position: 'absolute',
                    top: '60px',
                    right: '0',
                    width: '350px',
                    maxHeight: '400px',
                    background: theme === 'dark' ? '#374151' : '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{ margin: 0, color: theme === 'dark' ? '#fff' : '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            const token = sessionStorage.getItem("jwt-token");
                            await axios.patch(`/notifications/all/${user._id}/read`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                            setUnreadCount(0);
                          } catch (err) {
                            console.error('Error marking all as read:', err);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={async () => {
                            if (!notification.isRead) {
                              try {
                                const token = sessionStorage.getItem("jwt-token");
                                await axios.patch(`/notifications/${notification._id}/read`, {}, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                setNotifications(prev => prev.map(n => 
                                  n._id === notification._id ? { ...n, isRead: true } : n
                                ));
                                setUnreadCount(prev => Math.max(0, prev - 1));
                              } catch (err) {
                                console.error('Error marking notification as read:', err);
                              }
                            }
                          }}
                          style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            background: notification.isRead ? 'transparent' : (theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'),
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{
                            fontSize: '14px',
                            color: theme === 'dark' ? '#fff' : '#1f2937',
                            marginBottom: '4px',
                            fontWeight: notification.isRead ? '400' : '600'
                          }}>
                            {notification.message}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowHelp(true)}
              style={{
                background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme === 'dark' ? '#d1d5db' : '#4b5563'
              }}
              title="Keyboard shortcuts"
            >
              <FaQuestionCircle size={20} />
            </button>
            
            <button
              onClick={toggleTheme}
              style={{
                background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme === 'dark' ? '#fbbf24' : '#3b82f6'
              }}
            >
              {theme === 'light' ? <FaMoon size={22} /> : <FaSun size={22} />}
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div style={{
          flex: 1,
          padding: '32px',
          overflow: 'auto',
          width: '100%'
        }}>
          {content}
        </div>
        
        <ToastContainer />
        
        {/* Help Modal */}
        {showHelp && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
                Keyboard Shortcuts
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Profile</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>1</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Kanban</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>2</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Create New Task</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>3 or Ctrl+N</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Task List</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>4</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Completed Tasks</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>5</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Calendar</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>6</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Navigate to Analytics</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>7</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Close Modals</span>
                  <kbd style={{ background: theme === 'dark' ? '#4b5563' : '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>ESC</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>Double-click task to change status</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Kanban view</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  onClick={() => setShowHelp(false)}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Task Modal */}
        {showEditModal && editingTask && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
                Edit Task
              </h3>
              
              <form onSubmit={handleUpdateTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: theme === 'dark' ? '#4b5563' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#1f2937'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Enter company name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: theme === 'dark' ? '#4b5563' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#1f2937'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter task description"
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: theme === 'dark' ? '#4b5563' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#1f2937',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Assign To
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: theme === 'dark' ? '#4b5563' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#1f2937'
                    }}
                  >
                    <option value="">Select user...</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <div style={{ marginBottom: '8px' }}>
                    {renderStars(priority, setPriority)}
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: theme === 'dark' ? '#4b5563' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#1f2937'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTask(null);
                      setTitle(""); setDescription(""); setAssignedTo(""); setPriority(5); setDueDate(""); setCompany("");
                    }}
                    style={{
                      padding: '12px 24px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: loading ? '#9ca3af' : '#3b82f6',
                      color: '#fff',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" color="white" />
                        Updating...
                      </>
                    ) : (
                      'Update Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Stuck Reason Modal */}
        {showStuckModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '16px' }}>
                Why is this task stuck?
              </h3>
              
              <textarea
                value={stuckReason}
                onChange={(e) => setStuckReason(e.target.value)}
                placeholder="Describe what's blocking this task..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937'
                }}
              />
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowStuckModal(false);
                    setStuckReason('');
                    setStuckTaskId('');
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStuckSubmit}
                  disabled={!stuckReason.trim()}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: stuckReason.trim() ? '#ef4444' : '#9ca3af',
                    color: '#fff',
                    cursor: stuckReason.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Mark as Stuck
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;