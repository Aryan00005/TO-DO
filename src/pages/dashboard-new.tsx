import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DroppableProvided,
  type DropResult
} from "@hello-pangea/dnd";
import React, { useEffect, useState, useCallback } from "react";
import AvatarEdit from "react-avatar-edit";
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaColumns, FaMoon, FaPlus, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaCheckCircle, FaEdit, FaTrash, FaCopy, FaSync, FaFilter } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import FloatingActionButton from "../components/FloatingActionButton";
import axios from "../api/axios";
import type { User } from "../types/User";
import { validateTask } from "../utils/validation";

interface Task {
  _id: string;
  id?: number;
  title: string;
  description: string;
  status: string;
  assignedTo: string | User | User[];
  assignedBy?: string | User;
  priority: number;
  dueDate?: string;
  company?: string;
  completionRemark?: string;
  stuckReason?: string;
}

interface Notification {
  _id: string;
  id?: string;
  message: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

type KanbanTasksType = {
  [columnId: string]: Task[];
};

const statusColors: Record<string, string> = {
  "Not Started": "#64748b",
  "Working on it": "#fbbf24",
  "Stuck": "#ef4444",
  "Done": "#22c55e",
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [nav, setNav] = useState("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || "");
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [kanbanSort, setKanbanSort] = useState<"none" | "priority" | "date">("none");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingTaskApprovals, setPendingTaskApprovals] = useState<Task[]>([]);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const [selectedDate, setSelectedDate] = useState<string>(today.getDate().toString());

  if (!user || !user._id) {
    return <div>Loading user...</div>;
  }

  // Organization validation and setup
  if (!user.organization || !user.organization.name) {
    user.organization = { 
      name: user._id === 'jayraj' ? 'RLA' : user._id === 'testadmin' ? 'TestCorp' : 'Task Management', 
      type: 'company' 
    };
  }

  // Auto-refresh data every 30 seconds - DISABLED for performance
  // useEffect(() => {
  //   if (!autoRefresh) return;
  //   const interval = setInterval(() => {
  //     refreshData();
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [autoRefresh, user._id]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = sessionStorage.getItem("jwt-token");
      
      const [tasksRes, notificationsRes] = await Promise.all([
        axios.get(`/tasks/visible`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/notifications/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setTasks(tasksRes.data);
      setNotifications(notificationsRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err.response?.status === 401) {
        onLogout();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user._id, onLogout]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // Update UI immediately
    setTasks(prev => prev.map(task => 
      task._id === taskId ? { ...task, status: newStatus } : task
    ));
    
    showToast(`Task moved to ${newStatus}!`, "success");
    
    // Update in background
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.patch(`/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      // Revert on error
      refreshData();
      showToast("Failed to update task", "error");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTasks(prev => prev.filter(task => task._id !== taskId));
      showToast("Task deleted successfully!", "success");
    } catch (err) {
      showToast("Failed to delete task", "error");
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setCompany(task.company || '');
    
    // Handle single or multiple assignees
    if (Array.isArray(task.assignedTo)) {
      setAssignedTo(task.assignedTo.map(u => typeof u === 'object' ? u._id : u));
    } else if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      setAssignedTo([task.assignedTo._id]);
    } else if (task.assignedTo) {
      setAssignedTo([task.assignedTo]);
    } else {
      setAssignedTo([]);
    }
    
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setNav('assigntasks');
  };

  const duplicateTask = (task: Task) => {
    setTitle(task.title + ' (Copy)');
    setDescription(task.description);
    setCompany(task.company || '');
    
    // Handle single or multiple assignees
    if (Array.isArray(task.assignedTo)) {
      setAssignedTo(task.assignedTo.map(u => typeof u === 'object' ? u._id : u));
    } else if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      setAssignedTo([task.assignedTo._id]);
    } else if (task.assignedTo) {
      setAssignedTo([task.assignedTo]);
    } else {
      setAssignedTo([]);
    }
    
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setNav('assigntasks');
    showToast("Task copied for creation!", "success");
  };

  useEffect(() => {
    // Load users only once
    const token = sessionStorage.getItem("jwt-token");
    if (users.length === 0) {
      axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUsers(res.data))
        .catch(err => setUsers([user]));
    }
  }, []);

  useEffect(() => {
    // Load initial data only once
    const loadInitialData = async () => {
      const token = sessionStorage.getItem("jwt-token");
      try {
        const [tasksRes, usersRes, notificationsRes] = await Promise.all([
          axios.get(`/tasks/visible`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/notifications/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setTasks(tasksRes.data);
        setUsers(usersRes.data);
        setNotifications(notificationsRes.data);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };
    loadInitialData();
  }, [user._id]);

  useEffect(() => {
    if (nav === "assignedtasks") {
      const token = sessionStorage.getItem("jwt-token");
      axios.get(`/tasks/assignedBy/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Assigned tasks response:', res.data);
          setAssignedTasks(res.data);
        })
        .catch(err => {
          console.error("Error fetching assigned tasks:", err);
          showToast("Error loading assigned tasks: " + (err.response?.data?.message || err.message), "error");
        });
    }
  }, [nav, user._id]);

  // Fetch pending users and task approvals for admin
  useEffect(() => {
    if (nav === "userapprovals" && user.role === 'admin') {
      console.log('🔄 Fetching all users for admin:', user._id, user.company, user.role);
      const token = sessionStorage.getItem("jwt-token");
      
      // Fetch users
      axios.get("/auth/admin/all-users", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log('📊 All users response:', res.data);
        setPendingUsers(res.data);
      })
      .catch(err => {
        console.error("❌ Error fetching all users:", err);
        showToast("Error loading users: " + (err.response?.data?.message || err.message), "error");
      });
      
      // Fetch pending task approvals
      axios.get("/tasks/pending-approvals", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log('📊 Pending task approvals:', res.data);
        setPendingTaskApprovals(res.data);
      })
      .catch(err => {
        console.error("❌ Error fetching pending task approvals:", err);
      });
    }
  }, [nav, user._id, user.role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateTask({ title, description, assignedTo: assignedTo.join(','), dueDate });
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast(errors[0], 'error');
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      
      // Optimistic update - add task immediately
      const newTask = {
        _id: Date.now().toString(),
        title,
        description,
        status: 'Not Started',
        priority,
        dueDate,
        company,
        assignedTo: assignedTo.map(id => users.find(u => u._id === id) || { _id: id, name: 'Unknown' }),
        assignedBy: { _id: user._id, name: user.name }
      };
      
      setTasks(prev => [newTask, ...prev]);
      
      // Reset form immediately
      setTitle(""); setDescription(""); setAssignedTo([]); setPriority(3); setDueDate(""); setCompany("");
      setEditingTask(null);
      
      showToast(editingTask ? "Task updated! 🎉" : "Task created! 🎉", "success");
      
      // Make API call in background
      if (editingTask) {
        await axios.patch(`/tasks/${editingTask._id}`, { 
          title, description, assignedTo, priority, dueDate, company 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post("/tasks", { title, description, assignedTo, priority, dueDate, company }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Refresh only tasks in background
      refreshData();
      
      // Also refresh assigned tasks if on that view
      if (nav === "assignedtasks") {
        const token = sessionStorage.getItem("jwt-token");
        const res = await axios.get(`/tasks/assignedBy/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAssignedTasks(res.data);
      }
    } catch (err: any) {
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUserApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      console.log('🔄 Attempting user approval:', { userId, action });
      const token = sessionStorage.getItem("jwt-token");
      
      const requestData = {
        userId,
        action
      };
      console.log('📊 Request data:', requestData);
      
      await axios.post("/auth/admin/user-action", requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh all users
      const res = await axios.get("/auth/admin/all-users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
      
      showToast(`User ${action}d successfully! 🎉`, "success");
    } catch (err: any) {
      console.error('❌ User approval error:', err);
      console.error('❌ Error response:', err.response?.data);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleUserRemoval = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) return;
    
    try {
      console.log('🔄 Attempting user removal:', userId);
      const token = sessionStorage.getItem("jwt-token");
      
      await axios.delete(`/auth/admin/remove-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh all users
      const res = await axios.get("/auth/admin/all-users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
      
      showToast('User removed successfully! 🗑️', "success");
    } catch (err: any) {
      console.error('❌ User removal error:', err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleUserToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      console.log('🔄 Attempting user status toggle:', { userId, currentStatus, newStatus });
      const token = sessionStorage.getItem("jwt-token");
      
      await axios.post("/auth/admin/toggle-user-status", {
        userId,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh all users
      const res = await axios.get("/auth/admin/all-users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
      
      showToast(`User ${action}d successfully! ${newStatus === 'active' ? '✅' : '❌'}`, "success");
    } catch (err: any) {
      console.error('❌ User toggle error:', err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleTaskApproval = async (taskId: string, action: 'approve' | 'reject') => {
    try {
      console.log('🔄 Attempting task approval:', { taskId, action });
      const token = sessionStorage.getItem("jwt-token");
      
      await axios.post(`/tasks/${taskId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh pending task approvals
      const res = await axios.get("/tasks/pending-approvals", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingTaskApprovals(res.data);
      
      // Refresh tasks to show newly approved tasks
      refreshData();
      
      showToast(`Task ${action}d successfully! ${action === 'approve' ? '✅' : '❌'}`, "success");
    } catch (err: any) {
      console.error('❌ Task approval error:', err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleFABAction = (action: string) => {
    switch (action) {
      case 'task':
        setNav('assigntasks');
        break;
      case 'analytics':
        setNav('analytics');
        break;
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

  // Filter tasks based on search and status
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const kanbanColumns = ["Not Started", "Working on it", "Stuck", "Done"];
  const getKanbanTasks = (): KanbanTasksType => {
    const columns: KanbanTasksType = {};
    kanbanColumns.forEach(col => columns[col] = []);
    filteredTasks.forEach(task => {
      if (columns[task.status]) columns[task.status].push(task);
    });
    return columns;
  };
  const kanbanTasks = getKanbanTasks();

  const sortTasks = (tasks: Task[], sortBy: "none" | "priority" | "date") => {
    if (sortBy === "priority") {
      return [...tasks].sort((a, b) => b.priority - a.priority);
    }
    if (sortBy === "date") {
      return [...tasks].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return tasks;
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    
    if (sourceCol !== destCol) {
      const sourceTasksSorted = sortTasks(kanbanTasks[sourceCol], kanbanSort);
      const draggedTask = sourceTasksSorted[result.source.index];
      
      // Update task status via API
      await updateTaskStatus(draggedTask._id, destCol);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter(t => t.status === "Done").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = filteredTasks.filter(t => t.status === "Stuck").length;

  let content = null;
  if (nav === "profile") {
    content = (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Profile Card */}
        <div style={{
          background: theme === 'dark' ? "#374151" : "#fff",
          boxShadow: "0 4px 24px #c7d2fe44",
          borderRadius: 16,
          padding: 32,
          marginBottom: 24
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 24, flexDirection: "column" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{ cursor: "pointer" }}
                onClick={() => setShowAvatarEditor(true)}
                title="Edit profile photo"
              >
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
                  border: "3px solid #2563eb"
                }}>
                  {getInitials(user.name)}
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 22, marginTop: 10, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{user.name}</div>
            <div style={{ color: "#64748b" }}>{user.email}</div>
            <div style={{ color: "#2563eb", fontSize: 14, marginTop: 4 }}>
              {user.role === 'admin' ? '👑 Admin' : '👤 User'} • {user.organization?.name || 'No Organization'}
            </div>
          </div>
          
          {/* Profile Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={{ textAlign: "center", padding: 12, background: theme === 'dark' ? "#4b5563" : "#f8fafc", borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{totalTasks}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Total Tasks</div>
            </div>
            <div style={{ textAlign: "center", padding: 12, background: theme === 'dark' ? "#4b5563" : "#f8fafc", borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{doneTasks}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Completed</div>
            </div>
            <div style={{ textAlign: "center", padding: 12, background: theme === 'dark' ? "#4b5563" : "#f8fafc", borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24" }}>{inProgressTasks}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>In Progress</div>
            </div>
            <div style={{ textAlign: "center", padding: 12, background: theme === 'dark' ? "#4b5563" : "#f8fafc", borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{stuckTasks}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Stuck</div>
            </div>
          </div>
          
          {/* Profile Details */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>User ID:</span>
              <span style={{ marginLeft: 8, color: "#64748b" }}>{user._id}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Role:</span>
              <span style={{ marginLeft: 8, color: "#64748b" }}>{user.role || 'User'}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Organization:</span>
              <span style={{ marginLeft: 8, color: "#64748b" }}>{user.organization?.name || 'Not assigned'}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Completion Rate:</span>
              <span style={{ marginLeft: 8, color: totalTasks > 0 && (doneTasks / totalTasks) > 0.7 ? "#22c55e" : "#64748b" }}>
                {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div style={{
          background: theme === 'dark' ? "#374151" : "#fff",
          boxShadow: "0 4px 24px #c7d2fe44",
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            📊 Recent Activity
          </div>
          <div style={{ color: "#64748b" }}>
            {filteredTasks.length > 0 ? (
              <div>
                <div>• Last task: {filteredTasks[filteredTasks.length - 1]?.title}</div>
                <div>• Most recent status: {filteredTasks[filteredTasks.length - 1]?.status}</div>
                <div>• Tasks this month: {filteredTasks.filter(t => new Date(t.dueDate || '').getMonth() === new Date().getMonth()).length}</div>
              </div>
            ) : (
              <div>No recent activity. Start by creating your first task!</div>
            )}
          </div>
        </div>
        
        {/* Avatar Editor Modal */}
        {showAvatarEditor && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "#0008", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{ background: "#fff", padding: 32, borderRadius: 16, boxShadow: "0 4px 24px #0004" }}>
              <AvatarEdit
                width={320}
                height={320}
                onCrop={(img) => { setAvatar(img); setShowAvatarEditor(false); }}
                onClose={() => setShowAvatarEditor(false)}
                src={avatar || undefined}
                label="Upload new profile photo"
              />
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button style={{ background: "#b5179e", color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => setShowAvatarEditor(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (nav === "analytics") {
    content = (
      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24, marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 180, background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 16 }}>Total Tasks</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{totalTasks}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>All assigned tasks</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>Completed</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{doneTasks}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% completion rate
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 16 }}>In Progress</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{inProgressTasks}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Currently active</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 16 }}>Stuck</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{stuckTasks}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Need attention</div>
        </div>
      </div>
    );
  } else if (nav === "kanban") {
    content = (
      <div>
        {/* Dynamic Controls */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #dbeafe", minWidth: 200 }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFilter />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #dbeafe" }}
            >
              <option value="all">All Status</option>
              <option value="Not Started">Not Started</option>
              <option value="Working on it">Working on it</option>
              <option value="Stuck">Stuck</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Sort:</label>
            <select
              value={kanbanSort}
              onChange={e => setKanbanSort(e.target.value as "none" | "priority" | "date")}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #dbeafe" }}
            >
              <option value="none">None</option>
              <option value="priority">Priority</option>
              <option value="date">Due Date</option>
            </select>
          </div>
          
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.7 : 1
            }}
          >
            <FaSync className={isRefreshing ? 'fa-spin' : ''} />
            Refresh
          </button>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container" style={{ display: "flex", gap: 16, overflowX: "auto", maxWidth: "100%" }}>
            {kanbanColumns.map(col => {
              const tasksArray = kanbanTasks[col] || [];
              const tasksToRender = sortTasks(tasksArray, kanbanSort);
              return (
                <Droppable droppableId={col} key={col}>
                  {(provided: DroppableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="kanban-column"
                      style={{
                        width: "280px",
                        maxWidth: "280px",
                        flexShrink: 0,
                        background: theme === 'dark' ? "#374151" : "#f8fafc",
                        border: theme === 'dark' ? "2px solid #4b5563" : "2px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        boxShadow: theme === 'dark' ? "0 4px 16px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.08)",
                        minHeight: 200
                      }}
                    >
                      <div style={{ fontWeight: 700, color: statusColors[col], marginBottom: 12, fontSize: 18 }}>
                        {col} ({tasksToRender.length})
                      </div>
                      {tasksToRender.length === 0 && (
                        <div style={{ color: "#64748b", fontSize: 14 }}>No tasks</div>
                      )}
                      {tasksToRender.map((task, idx) => (
                        <Draggable draggableId={task._id} index={idx} key={task._id}>
                          {(provided: DraggableProvided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="task-card"
                              style={{
                                background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#fff",
                                border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
                                borderRadius: 8,
                                marginBottom: 8,
                                boxShadow: "0 1px 4px #c7d2fe22",
                                position: "relative",
                                cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                userSelect: 'none',
                                padding: 12,
                                ...provided.draggableProps.style
                              }}
                            >
                              {/* Task Action Buttons */}
                              <div style={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8, 
                                display: 'flex', 
                                gap: 4, 
                                opacity: 0,
                                transition: 'opacity 0.2s'
                              }} className="task-actions">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editTask(task);
                                  }}
                                  style={{
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    fontSize: 10
                                  }}
                                  title="Edit Task"
                                >
                                  <FaEdit size={10} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateTask(task);
                                  }}
                                  style={{
                                    background: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    fontSize: 10
                                  }}
                                  title="Duplicate Task"
                                >
                                  <FaCopy size={10} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task._id);
                                  }}
                                  style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    fontSize: 10
                                  }}
                                  title="Delete Task"
                                >
                                  <FaTrash size={10} />
                                </button>
                              </div>
                              
                              <div style={{ fontWeight: 600, fontSize: 14, color: theme === 'dark' ? '#ffffff' : '#22223b', paddingRight: 60 }}>
                                {task.title}
                                <span style={{ float: "right", marginRight: 60 }}>{renderStars(task.priority)}</span>
                              </div>
                              <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 6, fontSize: 13 }}>{task.description}</div>
                              {task.company && (
                                <div style={{ fontSize: 12, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 2 }}>
                                  <b>Company:</b> {task.company}
                                </div>
                              )}
                              {task.assignedBy && (
                                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>
                                  <b>Assigned By:</b>{" "}
                                  {typeof task.assignedBy === "object" && task.assignedBy !== null
                                    ? task.assignedBy.name
                                    : users.find(u => (u._id || u.id) === task.assignedBy)?.name || "Unknown"}
                                </div>
                              )}
                              {task.assignedTo && (
                                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>
                                  <b>Assigned To:</b>{" "}
                                  {Array.isArray(task.assignedTo) 
                                    ? task.assignedTo.map(u => typeof u === 'object' ? u.name : users.find(user => (user._id || user.id) === u)?.name || u).join(', ')
                                    : typeof task.assignedTo === "object" && task.assignedTo !== null
                                    ? task.assignedTo.name
                                    : users.find(u => (u._id || u.id) === task.assignedTo)?.name || "Unknown"}
                                </div>
                              )}
                              {task.dueDate && (
                                <div style={{ color: "#2563eb", fontSize: 11, marginBottom: 2 }}>
                                  <FaCalendar style={{ marginRight: 4 }} />
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              {isOverdue(task) && (
                                <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 2, fontSize: 11 }}>
                                  Overdue!
                                </div>
                              )}
                              <div style={{
                                fontWeight: 600,
                                background: statusColors[task.status] + "22",
                                color: statusColors[task.status],
                                borderRadius: 6,
                                padding: "2px 8px",
                                display: "inline-block",
                                marginBottom: 4,
                                fontSize: 11
                              }}>
                                {task.status}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    );
  } else if (nav === "list") {
    // Task List View
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          <FaTasks style={{ marginRight: 8 }} /> All Tasks ({filteredTasks.length})
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filteredTasks.map(task => (
            <div key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#fff",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 1px 4px #c7d2fe22",
              position: "relative"
            }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#22223b' }}>
                {task.title}
                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
              </div>
              <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</div>
              {task.company && (
                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                  <b>Company:</b> {task.company}
                </div>
              )}
              {task.dueDate && (
                <div style={{ color: "#2563eb", fontSize: 13, marginBottom: 4 }}>
                  <FaCalendar style={{ marginRight: 4 }} />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              <div style={{
                fontWeight: 600,
                background: statusColors[task.status] + "22",
                color: statusColors[task.status],
                borderRadius: 8,
                padding: "2px 10px",
                display: "inline-block"
              }}>
                {task.status}
              </div>
            </div>
          ))}
        </div>
        
        {filteredTasks.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, marginTop: 40 }}>
            No tasks found. Create your first task!
          </div>
        )}
      </div>
    );
  } else if (nav === "completed") {
    // Completed Tasks View
    const completedTasks = filteredTasks.filter(t => t.status === "Done");
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          ✅ Completed Tasks ({completedTasks.length})
        </div>
        
        <div style={{ background: theme === 'dark' ? "#22c55e22" : "#f0fdf4", border: "1px solid #22c55e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ color: "#22c55e", fontWeight: 600 }}>
            🎉 Great job! You've completed {completedTasks.length} out of {totalTasks} tasks 
            ({totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}% completion rate)
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {completedTasks.map(task => (
            <div key={task._id} style={{
              background: theme === 'dark' ? "#4b5563" : "#f9fafb",
              border: "1.5px solid #22c55e",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 1px 4px #22c55e22",
              position: "relative",
              opacity: 0.9
            }}>
              <div style={{ position: "absolute", top: 8, right: 8, background: "#22c55e", color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✓</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#22223b', paddingRight: 30 }}>
                {task.title}
                <span style={{ float: "right", marginRight: 30 }}>{renderStars(task.priority)}</span>
              </div>
              <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</div>
              {task.company && (
                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                  <b>Company:</b> {task.company}
                </div>
              )}
              {task.dueDate && (
                <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 4 }}>
                  <FaCalendar style={{ marginRight: 4 }} />
                  Completed: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              <div style={{
                fontWeight: 600,
                background: "#22c55e22",
                color: "#22c55e",
                borderRadius: 8,
                padding: "2px 10px",
                display: "inline-block"
              }}>
                ✅ {task.status}
              </div>
            </div>
          ))}
        </div>
        
        {completedTasks.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, marginTop: 40 }}>
            No completed tasks yet. Keep working! 💪
          </div>
        )}
      </div>
    );
  } else if (nav === "calendar") {
    // Calendar View
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          <FaCalendarAlt style={{ marginRight: 8 }} /> Calendar
        </div>
        <div className="calendar-grid" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {calendarDates.map(day => (
            <div
              key={day}
              onClick={() => setSelectedDate(day.toString())}
              className="calendar-day"
              style={{
                width: 38, height: 38, lineHeight: "38px", textAlign: "center",
                borderRadius: "50%", cursor: "pointer",
                background: selectedDate === day.toString() ? "#2563eb" : "#e0e7ef",
                color: selectedDate === day.toString() ? "#fff" : "#22223b",
                fontWeight: 600, fontSize: 16
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            Tasks for {selectedDate ? `Day ${selectedDate}` : "this month"}:
          </div>
          {filteredTasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).length === 0 && (
            <div style={{ color: "#64748b" }}>No tasks for this day.</div>
          )}
          {filteredTasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).map(task => (
            <div key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#f9fafb",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              boxShadow: "0 1px 4px #c7d2fe22"
            }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {task.title}
                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
              </div>
              <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</div>
              {task.company && (
                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                  <b>Company:</b> {task.company}
                </div>
              )}
              {task.dueDate && (
                <div style={{ color: "#2563eb", fontSize: 13, marginBottom: 4 }}>
                  <FaCalendar style={{ marginRight: 4 }} />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              <div style={{
                fontWeight: 600,
                background: statusColors[task.status] + "22",
                color: statusColors[task.status],
                borderRadius: 8,
                padding: "2px 10px",
                display: "inline-block"
              }}>
                {task.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (nav === "assigntasks") {
    // Assign Tasks Form - Main Feature
    content = (
      <form
        onSubmit={handleCreate}
        className="task-form"
        style={{
          background: theme === 'dark' ? "#374151" : "#fff",
          boxShadow: "0 4px 24px #c7d2fe33",
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 22, color: "#2563eb", marginBottom: 8 }}>
          {editingTask ? '✏️ Edit Task' : '📝 Create New Task'}
        </div>
        
        {validationErrors.length > 0 && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16
          }}>
            <div style={{ color: "#dc2626", fontWeight: 600, fontSize: "14px", marginBottom: 8 }}>
              Please fix the following errors:
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, color: "#dc2626", fontSize: "13px" }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Task Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Title"
          required
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, width: "100%" }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Company</label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company Name"
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, width: "100%" }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          required
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, width: "100%" }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Assign To (Multiple)</label>
        <div style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          maxHeight: 200,
          overflowY: 'auto',
          background: theme === 'dark' ? '#4b5563' : '#fff'
        }}>
          {users.length > 0 && (() => {
            const priorityNames = ['Rajendrasinh Raj', 'Nishit Raj'];
            const priorityUsers = users.filter(u => priorityNames.includes(u.name));
            const otherUsers = users.filter(u => !priorityNames.includes(u.name));
            const sortedUsers = [...priorityUsers, ...otherUsers];
            
            return sortedUsers.map(u => (
              <div key={u._id || u.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <input
                  type="checkbox"
                  id={`user-${u._id || u.id}`}
                  checked={assignedTo.includes(u._id || u.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAssignedTo([...assignedTo, u._id || u.id]);
                    } else {
                      setAssignedTo(assignedTo.filter(id => id !== (u._id || u.id)));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <label 
                  htmlFor={`user-${u._id || u.id}`}
                  style={{ 
                    cursor: 'pointer', 
                    flex: 1,
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}
                >
                  {u.name}
                </label>
              </div>
            ));
          })()}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          Select multiple users by checking the boxes
        </div>
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Priority</label>
        <div style={{ marginBottom: 8 }}>{renderStars(priority, setPriority)}</div>
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Due Date</label>
        <input 
          type="date" 
          value={dueDate} 
          onChange={(e) => setDueDate(e.target.value)} 
          min={new Date().toISOString().split('T')[0]} // Prevent past dates
          required 
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, width: "100%" }} 
        />
        
        <button type="submit" disabled={loading} style={{
          fontWeight: 600, fontSize: "1.1rem", background: loading ? "#ccc" : "#2563eb",
          color: "#fff", padding: "12px 24px", borderRadius: 8, border: "none",
          cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8
        }}>
          {loading ? (
            <>
              <LoadingSpinner size="small" color="white" />
              {editingTask ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            editingTask ? 'Update Task' : 'Create Task'
          )}
        </button>
        
        {editingTask && (
          <button 
            type="button" 
            onClick={() => {
              setEditingTask(null);
              setTitle(''); setDescription(''); setAssignedTo([]); setPriority(3); setDueDate(''); setCompany('');
            }}
            style={{
              fontWeight: 600, fontSize: "1rem", background: "#6b7280",
              color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none",
              cursor: "pointer", marginTop: 8
            }}
          >
            Cancel Edit
          </button>
        )}
      </form>
    );
  } else if (nav === "assignedtasks") {
    // Tasks You Assigned - Main Feature from Original
    const assignedKanbanColumns = ["Not Started", "Working on it", "Stuck", "Done"];
    const assignedKanbanTasks: Record<string, Task[]> = {
      "Not Started": [],
      "Working on it": [],
      "Stuck": [],
      "Done": [],
    };
    assignedTasks.forEach(task => {
      assignedKanbanTasks[task.status] = assignedKanbanTasks[task.status] || [];
      assignedKanbanTasks[task.status].push(task);
    });

    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          <FaUser style={{ marginRight: 8 }} /> Tasks You Assigned ({assignedTasks.length})
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", overflowX: "auto" }}>
          {assignedKanbanColumns.map(col => (
            <div
              key={col}
              className="kanban-column"
              style={{
                minWidth: 260,
                background: theme === 'dark' ? "#4b5563" : "#f9fafb",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 2px 12px #c7d2fe22",
                minHeight: 200
              }}
            >
              <div style={{ fontWeight: 700, color: statusColors[col], marginBottom: 12, fontSize: 18 }}>
                {col} ({assignedKanbanTasks[col].length})
              </div>
              {assignedKanbanTasks[col].length === 0 && (
                <div style={{ color: "#64748b", fontSize: 14 }}>No tasks</div>
              )}
              {assignedKanbanTasks[col].map(task => (
                <div key={task._id} style={{
                  background: theme === 'dark' ? "#6b7280" : "#fff",
                  border: "1.5px solid #dbeafe",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: "0 1px 4px #c7d2fe22",
                  position: "relative"
                }}>
                  {/* Action Buttons */}
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
                    <button
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        border: "none",
                        cursor: "pointer"
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        editTask(task);
                        showToast("Task loaded for editing!", "success");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        border: "none",
                        cursor: "pointer"
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        duplicateTask(task);
                      }}
                    >
                      Copy
                    </button>
                    <button
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        border: "none",
                        cursor: "pointer"
                      }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this task?")) {
                          try {
                            const token = sessionStorage.getItem("jwt-token");
                            await axios.delete(`/tasks/${task._id}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            // Refresh assigned tasks
                            const res = await axios.get(`/tasks/assignedBy/${user._id}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setAssignedTasks(res.data);
                            showToast("Task deleted successfully!", "success");
                          } catch (err: any) {
                            console.error('Delete error:', err);
                            showToast("Failed to delete task: " + (err.response?.data?.message || err.message), "error");
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#000000', paddingRight: 80 }}>
                    {task.title}
                    <span style={{ float: "right", marginRight: 80 }}>{renderStars(task.priority)}</span>
                  </div>
                  <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</div>
                  {task.company && (
                    <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                      <b>Company:</b> {task.company}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 8 }}>
                    <b>Assigned To:</b> {
                      Array.isArray(task.assignedTo) 
                        ? task.assignedTo.map(u => typeof u === 'object' ? u.name : users.find(user => (user._id || user.id) === u)?.name || u).join(', ')
                        : typeof task.assignedTo === "object" && task.assignedTo !== null
                        ? task.assignedTo.name
                        : users.find(u => (u._id || u.id) === task.assignedTo)?.name || "Unknown"
                    }
                  </div>
                  {task.dueDate && (
                    <div style={{ color: "#2563eb", fontSize: 13, marginBottom: 4 }}>
                      <FaCalendar style={{ marginRight: 4 }} />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  <div style={{
                    fontWeight: 600,
                    background: statusColors[task.status] + "22",
                    color: statusColors[task.status],
                    borderRadius: 8,
                    padding: "2px 10px",
                    display: "inline-block",
                    marginBottom: 8
                  }}>
                    {task.status}
                  </div>
                  {task.completionRemark && (
                    <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : "#666", marginTop: 8 }}>
                      <b>Remark:</b> {task.completionRemark}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {assignedTasks.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, marginTop: 40 }}>
            No tasks assigned yet. Create your first task!
          </div>
        )}
      </div>
    );
  } else if (nav === "userapprovals" && user.role === 'admin') {
    // User Approvals for Admin
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          Admin Dashboard
        </div>
        
        {/* Pending Task Approvals Section */}
        {pendingTaskApprovals.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
              📝 Pending Task Approvals ({pendingTaskApprovals.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16, marginBottom: 24 }}>
              {pendingTaskApprovals.map(task => (
                <div key={task._id} style={{
                  background: theme === 'dark' ? "#4b5563" : "#fff3cd",
                  border: "2px solid #f59e0b",
                  borderRadius: 10,
                  padding: 20,
                  boxShadow: "0 2px 8px #f59e0b44",
                  position: "relative"
                }}>
                  <div style={{ 
                    position: "absolute", 
                    top: 8, 
                    right: 8, 
                    background: "#f59e0b", 
                    color: "white", 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    fontSize: 11, 
                    fontWeight: 600 
                  }}>
                    PENDING APPROVAL
                  </div>
                  
                  <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#22223b', marginBottom: 8, paddingRight: 120 }}>
                    {task.title}
                  </div>
                  
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 8 }}>
                    {task.description}
                  </div>
                  
                  <div style={{ fontSize: 12, color: "#2563eb", marginBottom: 8 }}>
                    <b>Assigned by:</b> {typeof task.assignedBy === 'object' ? task.assignedBy?.name : 'Unknown'}
                  </div>
                  
                  <div style={{ fontSize: 12, color: "#2563eb", marginBottom: 12 }}>
                    <b>Due:</b> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => handleTaskApproval(task._id, 'approve')}
                      style={{
                        background: "#22c55e",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        flex: 1
                      }}
                    >
                      ✅ Approve Task
                    </button>
                    <button
                      onClick={() => handleTaskApproval(task._id, 'reject')}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        flex: 1
                      }}
                    >
                      ❌ Reject Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* User Management Section */}
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
          👥 User Management ({pendingUsers.length})
        </div>
        
        {pendingUsers.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#64748b", 
            fontSize: 16, 
            marginTop: 40,
            background: theme === 'dark' ? "#4b5563" : "#f8fafc",
            padding: 32,
            borderRadius: 12
          }}>
            🎉 No users in your company yet!
            <div style={{ fontSize: 14, marginTop: 8 }}>
              When users register with your company code, they'll appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
            {pendingUsers.map(pendingUser => {
              const isPending = pendingUser.account_status === 'pending';
              const isActive = pendingUser.account_status === 'active';
              const isInactive = pendingUser.account_status === 'inactive';
              
              return (
                <div key={pendingUser._id || pendingUser.id} style={{
                  background: theme === 'dark' ? "#4b5563" : "#fff5f5",
                  border: isPending ? "2px solid #f59e0b" : isActive ? "2px solid #22c55e" : isInactive ? "2px solid #6b7280" : "2px solid #ef4444",
                  borderRadius: 10,
                  padding: 20,
                  boxShadow: isPending ? "0 2px 8px #f59e0b44" : isActive ? "0 2px 8px #22c55e44" : isInactive ? "0 2px 8px #6b728044" : "0 2px 8px #ef444444",
                  position: "relative"
                }}>
                  <div style={{ 
                    position: "absolute", 
                    top: 8, 
                    right: 8, 
                    background: isPending ? "#f59e0b" : isActive ? "#22c55e" : isInactive ? "#6b7280" : "#ef4444", 
                    color: "white", 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    fontSize: 11, 
                    fontWeight: 600 
                  }}>
                    {isPending ? 'PENDING' : isActive ? 'ACTIVE' : isInactive ? 'INACTIVE' : 'REJECTED'}
                  </div>
                  
                  <div style={{ fontWeight: 600, fontSize: 18, color: theme === 'dark' ? '#ffffff' : '#22223b', marginBottom: 8, paddingRight: 80 }}>
                    {pendingUser.name}
                  </div>
                  
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 8 }}>
                    <b>Email:</b> {pendingUser.email}
                  </div>
                  
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 8 }}>
                    <b>User ID:</b> {pendingUser.userId || pendingUser.user_id || pendingUser._id}
                  </div>
                  
                  <div style={{ fontSize: 14, color: "#2563eb", marginBottom: 12 }}>
                    <b>Status:</b> {pendingUser.account_status || 'Unknown'}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleUserApproval(pendingUser.id || pendingUser._id, 'approve')}
                          style={{
                            background: "#22c55e",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            flex: 1
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleUserApproval(pendingUser.id || pendingUser._id, 'reject')}
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            flex: 1
                          }}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    
                    {(isActive || isInactive) && (
                      <button
                        onClick={() => handleUserToggle(pendingUser.id || pendingUser._id, pendingUser.account_status)}
                        style={{
                          background: isActive ? "#6b7280" : "#22c55e",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          flex: 1
                        }}
                      >
                        {isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                      </button>
                    )}
                    
                    {(isActive || isInactive || pendingUser.account_status === 'rejected') && (
                      <button
                        onClick={() => handleUserRemoval(pendingUser.id || pendingUser._id)}
                        style={{
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          width: "100%",
                          marginTop: 8
                        }}
                      >
                        🗑️ Remove User
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead && !n.is_read).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      <style>
        {`
          .task-card:hover .task-actions {
            opacity: 1 !important;
          }
          .fa-spin {
            animation: fa-spin 2s infinite linear;
          }
          @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
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
        boxShadow: theme === 'dark' ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.08)',
        overflowY: 'auto'
      }}>
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

        <div style={{ flex: 1, padding: '16px 0' }}>
          {[
            { key: 'profile', icon: FaUser, label: 'Profile' },
            { key: 'kanban', icon: FaColumns, label: 'Tasks Board' },
            { key: 'assigntasks', icon: FaPlus, label: 'Assign Tasks' },
            { key: 'assignedtasks', icon: FaUser, label: 'Tasks Assigned' },
            { key: 'list', icon: FaTasks, label: 'Task List' },
            { key: 'completed', icon: FaCheckCircle, label: 'Completed Tasks' },
            ...(user.role === 'admin' ? [{ key: 'userapprovals', icon: FaUser, label: 'User Management' }] : []),
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '280px', minHeight: '100vh', width: 'calc(100vw - 280px)' }}>
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
            {user.organization?.name} Task Management System
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '50%',
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: theme === 'dark' ? '#ffffff' : '#6b7280'
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <FaMoon size={22} /> : <FaSun size={22} />}
            </button>
            <div style={{ position: "relative" }}>
              <button
                style={{
                  background: theme === 'dark' ? "#4b5563" : "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "50%",
                  width: 52,
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  color: theme === 'dark' ? '#ffffff' : "#6b7280"
                }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FaBell size={22} />
              </button>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#b5179e",
                    color: "#fff",
                    borderRadius: "50%",
                    padding: "2px 7px",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 1px 4px #b5179e44"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 32px', flex: 1, background: theme === 'dark' ? '#1e293b' : '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
          {content}
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div style={{
            position: 'fixed',
            top: 80,
            right: 20,
            width: 400,
            maxHeight: 500,
            background: theme === 'dark' ? '#374151' : '#fff',
            border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
              background: theme === 'dark' ? '#4b5563' : '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: theme === 'dark' ? '#ffffff' : '#1f2937', fontSize: 16, fontWeight: 600 }}>
                Notifications ({notifications.length})
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 18
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: 40,
                  textAlign: 'center',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(notification => {
                  const isApprovalNotification = notification.message.includes('approval required');
                  
                  return (
                    <div key={notification._id} style={{
                      padding: '16px 20px',
                      borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #f3f4f6',
                      background: (notification.isRead || notification.is_read) ? 'transparent' : (theme === 'dark' ? '#1f2937' : '#f0f9ff'),
                      cursor: 'pointer'
                    }}>
                      <div style={{
                        fontSize: 14,
                        color: theme === 'dark' ? '#e5e7eb' : '#374151',
                        marginBottom: 4,
                        lineHeight: 1.4
                      }}>
                        {notification.message}
                      </div>
                      
                      <div style={{
                        fontSize: 12,
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: isApprovalNotification ? 8 : 0
                      }}>
                        {new Date(notification.createdAt || notification.created_at || '').toLocaleString()}
                      </div>
                      
                      {isApprovalNotification && user.role === 'admin' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const token = sessionStorage.getItem("jwt-token");
                                
                                // Extract task title from notification message
                                const match = notification.message.match(/Task approval required: "([^"]+)"/);
                                if (match) {
                                  const taskTitle = match[1];
                                  
                                  // Use the debug endpoint to find the task
                                  const debugRes = await axios.get('/tasks/debug-all', {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  
                                  const task = debugRes.data.find((t: any) => t.title === taskTitle && t.approval_status === 'pending');
                                  
                                  if (task) {
                                    await axios.post(`/notifications/approve-task/${notification._id || notification.id}`, {
                                      taskId: task.id
                                    }, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    
                                    showToast('Task approved successfully! ✅', 'success');
                                    refreshData();
                                  } else {
                                    showToast('Task not found or already processed', 'error');
                                  }
                                } else {
                                  showToast('Could not extract task information', 'error');
                                }
                              } catch (err: any) {
                                console.error('Error approving from notification:', err);
                                showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
                              }
                            }}
                            style={{
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const token = sessionStorage.getItem("jwt-token");
                                
                                // Extract task title from notification message
                                const match = notification.message.match(/Task approval required: "([^"]+)"/);
                                if (match) {
                                  const taskTitle = match[1];
                                  
                                  // Use the debug endpoint to find the task
                                  const debugRes = await axios.get('/tasks/debug-all', {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  
                                  const task = debugRes.data.find((t: any) => t.title === taskTitle && t.approval_status === 'pending');
                                  
                                  if (task) {
                                    await axios.post(`/notifications/reject-task/${notification._id || notification.id}`, {
                                      taskId: task.id
                                    }, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    
                                    showToast('Task rejected successfully! ❌', 'success');
                                    refreshData();
                                  } else {
                                    showToast('Task not found or already processed', 'error');
                                  }
                                } else {
                                  showToast('Could not extract task information', 'error');
                                }
                              } catch (err: any) {
                                console.error('Error rejecting from notification:', err);
                                showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
                              }
                            }}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {notifications.length > 0 && (
              <div style={{
                padding: '12px 20px',
                borderTop: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
                background: theme === 'dark' ? '#4b5563' : '#f8fafc'
              }}>
                <button
                  onClick={async () => {
                    try {
                      const token = sessionStorage.getItem("jwt-token");
                      await axios.patch(`/notifications/all/${user._id}/read`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      refreshData();
                    } catch (err) {
                      console.error('Error marking all as read:', err);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: 12,
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}

        <FloatingActionButton onAction={handleFABAction} />
        <ToastContainer />
      </div>
    </div>
  );
};

export default Dashboard;