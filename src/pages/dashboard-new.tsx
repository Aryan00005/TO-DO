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
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaColumns, FaMoon, FaPlus, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaCheckCircle, FaSync, FaFilter } from "react-icons/fa";
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
  rejectionReason?: string;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  createdAt?: string;
  updatedAt?: string;
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

const normalizeTask = (t: any): Task => ({
  ...t,
  _id: String(t._id || t.id),
  assignedTo: t.assignedTo || t.assigned_to,
  assignedBy: t.assignedBy || t.assigned_by,
  dueDate: t.dueDate || t.due_date,
  completionRemark: t.completionRemark || t.completion_remark,
  stuckReason: t.stuckReason || t.stuck_reason,
  rejectionReason: t.rejectionReason || t.rejection_reason,
  approvalStatus: t.approvalStatus || t.approval_status,
  approved_at: t.approved_at,
});

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
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || "");
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [kanbanSort, setKanbanSort] = useState<"none" | "priority" | "date">("none");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setLastUpdated] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => { /* autoRefresh placeholder */ }, []);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingTaskApprovals, setPendingTaskApprovals] = useState<Task[]>([]);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [filterAssignedBy, setFilterAssignedBy] = useState<string>('all');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTaskId, setRejectingTaskId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showUserTasksModal, setShowUserTasksModal] = useState(false);
  const [selectedUserForTasks, setSelectedUserForTasks] = useState<User | null>(null);
  const [userTasksFilter, setUserTasksFilter] = useState<string>('all');
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [stuckReason, setStuckReason] = useState('');
  const [stuckTaskId, setStuckTaskId] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUserId, setNewUserUserId] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const adminDataFetchedAt = React.useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const today = new Date();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const [selectedDate, setSelectedDate] = useState<string>(today.getDate().toString());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setNav('assigntasks');
        showToast('📝 Create Task', 'success');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setNav('kanban');
        showToast('📊 Kanban Board', 'success');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
        showToast(`🎨 ${theme === 'light' ? 'Dark' : 'Light'} Mode`, 'success');
      } else if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowRejectModal(false);
        setShowAvatarEditor(false);
        setShowUserTasksModal(false);
        setShowTaskDetailsModal(false);
      } else if (e.key >= '1' && e.key <= '9') {
        const navMap: Record<string, string> = {
          '1': 'profile',
          '2': 'kanban',
          '3': 'assigntasks',
          '4': 'list',
          '5': 'completed',
          '6': 'calendar',
          '7': 'analytics',
          '8': 'userapprovals',
          '9': 'adduser'
        };
        if (navMap[e.key]) {
          setNav(navMap[e.key]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, toggleTheme, showToast]);

  // Click outside to close modals
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showNotifications && !target.closest('.notifications-panel') && !target.closest('button[aria-label="notifications"]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  if (!user || !user._id) {
    return <div>Loading user...</div>;
  }

  // Organization validation and setup
  if (!user.organization || !user.organization.name) {
    user.organization = {
      name: user._id === 'jayraj' ? 'RLA' : user._id === 'testadmin' ? 'TestCorp' : 'My Company', 
      type: 'company'
    };
  } else {
    // Override organization name based on user ID
    if (user._id === 'jayraj') {
      user.organization.name = 'RLA';
    } else if (user._id === 'testadmin') {
      user.organization.name = 'TestCorp';
    }
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
      const [tasksRes, notificationsRes, assignedRes] = await Promise.all([
        axios.get(`/tasks/visible`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/notifications/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/tasks/assignedBy/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTasks(tasksRes.data.map(normalizeTask));
      setNotifications(notificationsRes.data);
      setAssignedTasks(assignedRes.data.map(normalizeTask));
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
    if (newStatus === 'Stuck') {
      setStuckTaskId(taskId);
      setShowStuckModal(true);
      return;
    }
    
    // Update UI immediately — update both tasks and assignedTasks
    setTasks(prev => prev.map(task => 
      task._id === taskId ? { ...task, status: newStatus } : task
    ));
    setAssignedTasks(prev => prev.map(task =>
      task._id === taskId ? { ...task, status: newStatus } : task
    ));
    
    showToast(`Task moved to ${newStatus}!`, "success");
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.patch(`/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      refreshData();
      showToast("Failed to update task", "error");
    }
  };

  const handleStuckSubmit = async () => {
    if (!stuckReason.trim()) {
      showToast('Stuck reason is required', 'error');
      return;
    }
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      const reason = stuckReason.trim();
      const taskId = stuckTaskId;

      setTasks(prev => prev.map(task =>
        task._id === taskId ? { ...task, status: 'Stuck', stuckReason: reason } : task
      ));
      setAssignedTasks(prev => prev.map(task =>
        task._id === taskId ? { ...task, status: 'Stuck', stuckReason: reason } : task
      ));
      setShowStuckModal(false);
      setStuckReason('');
      setStuckTaskId('');
      showToast('Task marked as Stuck', 'success');

      await axios.patch(`/tasks/${taskId}`, {
        status: 'Stuck',
        stuckReason: reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    // Optimistic: remove immediately
    setTasks(prev => prev.filter(t => t._id !== taskId));
    setAssignedTasks(prev => prev.filter(t => t._id !== taskId));
    showToast("Task deleted successfully!", "success");

    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Revert on failure
      refreshData();
      showToast("Failed to delete task", "error");
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setCompany(task.company || '');
    
    // Handle single or multiple assignees - normalize to string IDs
    if (Array.isArray(task.assignedTo)) {
      setAssignedTo(task.assignedTo.map(u => String(typeof u === 'object' ? (u._id || u.id) : u)));
    } else if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      setAssignedTo([String(task.assignedTo._id || task.assignedTo.id)]);
    } else if (task.assignedTo) {
      setAssignedTo([String(task.assignedTo)]);
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
    // Load initial data only once
    const loadInitialData = async () => {
      const token = sessionStorage.getItem("jwt-token");
      try {
        const [tasksRes, usersRes, notificationsRes] = await Promise.all([
          axios.get(`/tasks/visible`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/notifications/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setTasks(tasksRes.data.map(normalizeTask));
        console.log('🔍 API DEBUG - /tasks/visible raw response:', tasksRes.data.map((t: any) => ({
          id: t.id || t._id, title: t.title, status: t.status,
          approval_status: t.approval_status, approvalStatus: t.approvalStatus,
          assigned_by: t.assigned_by, assignedBy: t.assignedBy,
          assignedTo: t.assignedTo, assigned_to: t.assigned_to
        })));
        setUsers(usersRes.data);
        setNotifications(notificationsRes.data);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };
    loadInitialData();
  }, [user._id]);

  // Load assignedTasks once on mount only — handleCreate updates it optimistically after that
  useEffect(() => {
    const token = sessionStorage.getItem("jwt-token");
    axios.get(`/tasks/assignedBy/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAssignedTasks(res.data.map(normalizeTask)))
      .catch(() => {});
  }, [user._id]);

  // Fetch pending users and task approvals for admin — cached for 60s
  useEffect(() => {
    if (nav === "userapprovals" && user.role === 'admin') {
      const now = Date.now();
      if (now - adminDataFetchedAt.current < 60_000) return;
      adminDataFetchedAt.current = now;

      const token = sessionStorage.getItem("jwt-token");
      Promise.all([
        axios.get("/auth/admin/all-users", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/tasks/pending-approvals", { headers: { Authorization: `Bearer ${token}` } })
      ])
        .then(([usersRes, approvalsRes]) => {
          setPendingUsers(usersRes.data);
          setPendingTaskApprovals(approvalsRes.data);
        })
        .catch(err => {
          adminDataFetchedAt.current = 0;
          showToast("Error loading admin data: " + (err.response?.data?.message || err.message), "error");
        });
    }
  }, [nav, user._id, user.role, showToast]);

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

    const token = sessionStorage.getItem("jwt-token");
    // Capture values before resetting form
    const taskTitle = title;
    const taskDescription = description;
    const taskAssignedTo = assignedTo;
    const taskPriority = priority;
    const taskDueDate = dueDate;
    const taskCompany = company;
    const taskEditing = editingTask;

    const hasAdminAssignee = !editingTask && assignedTo.some(id =>
      users.find(u => (u._id || u.id) === id)?.role === 'admin'
    );

    // Build optimistic task for instant UI update
    const optimisticId = `optimistic-${Date.now()}`;
    // Resolve user objects from IDs so names display immediately
    const resolvedAssignedTo: Task['assignedTo'] = taskAssignedTo.map(id => {
      const found = users.find(u => (u._id || u.id) === id);
      return found ? found : id;
    }) as User[];
    const optimisticTask: Task = {
      _id: optimisticId,
      title: taskTitle,
      description: taskDescription,
      assignedTo: resolvedAssignedTo,
      priority: taskPriority,
      dueDate: taskDueDate,
      company: taskCompany,
      status: 'Not Started',
      assignedBy: user,
      createdAt: new Date().toISOString(),
    };

    // Reset form
    setTitle(""); setDescription(""); setAssignedTo([]); setPriority(3); setDueDate(new Date().toISOString().split('T')[0]); setCompany("");
    setEditingTask(null);
    setLoading(false);

    if (!taskEditing) {
      // Add optimistic task immediately so it shows up right away
      setAssignedTasks(prev => [optimisticTask, ...prev]);
      setTasks(prev => [optimisticTask, ...prev]);
    }



    if (hasAdminAssignee) {
      showToast("Task sent for admin approval! ⏳", "success");
    } else {
      showToast(taskEditing ? "Task updated! 🎉" : "Task created! 🎉", "success");
    }

    // For edit: optimistically update state immediately
    if (taskEditing) {
      const optimisticEdit: Task = {
        ...taskEditing,
        title: taskTitle,
        description: taskDescription,
        assignedTo: resolvedAssignedTo as Task['assignedTo'],
        priority: taskPriority,
        dueDate: taskDueDate,
        company: taskCompany,
      };
      setTasks(prev => prev.map(t => t._id === taskEditing._id ? optimisticEdit : t));
      setAssignedTasks(prev => prev.map(t => t._id === taskEditing._id ? optimisticEdit : t));
    }

    // API call in background using captured values
    try {
      if (taskEditing) {
        const patchRes = await axios.patch(`/tasks/${taskEditing._id}`, {
          title: taskTitle, description: taskDescription, assignedTo: taskAssignedTo, priority: taskPriority, dueDate: taskDueDate, company: taskCompany
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = normalizeTask(patchRes.data.task || patchRes.data);
        setTasks(prev => prev.map(t => t._id === taskEditing._id ? { ...t, ...updated, _id: taskEditing._id } : t));
        setAssignedTasks(prev => prev.map(t => t._id === taskEditing._id ? { ...t, ...updated, _id: taskEditing._id } : t));
        setNav('assignedtasks');
      } else {
        const res = await axios.post("/tasks", { title: taskTitle, description: taskDescription, assignedTo: taskAssignedTo, priority: taskPriority, dueDate: taskDueDate, company: taskCompany }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const created = normalizeTask(res.data.task || res.data);
        // Replace optimistic task with real one from server
        setTasks(prev => prev.map(t => t._id === optimisticId ? created : t));
        setAssignedTasks(prev => prev.map(t => t._id === optimisticId ? created : t));
      }
    } catch (err: any) {
      if (taskEditing) {
        // Revert optimistic edit on failure
        refreshData();
      } else {
        // Remove optimistic task on failure
        setTasks(prev => prev.filter(t => t._id !== optimisticId));
        setAssignedTasks(prev => prev.filter(t => t._id !== optimisticId));
      }
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };
  
  const matchId = (t: Task, taskId: string) =>
    String(t._id) === String(taskId) || String((t as any).id) === String(taskId);

  const handleRejectTask = async (taskId: string, reason: string) => {
    const update = { status: 'Working on it', rejectionReason: reason, approvalStatus: 'rejected' as const };
    setFilterStatus('all');
    setTasks(prev => prev.map(t => matchId(t, taskId) ? { ...t, ...update } : t));
    setAssignedTasks(prev => prev.map(t => matchId(t, taskId) ? { ...t, ...update } : t));
    showToast("Task rejected and moved to Working on it! ❌", "success");
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.patch(`/tasks/${taskId}`, { 
        status: 'Working on it',
        rejection_reason: reason,
        approval_status: 'rejected'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      refreshData();
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleApproveTask = async (taskId: string) => {
    const update = { approvalStatus: 'approved' as const };
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...update } : t));
    setAssignedTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...update } : t));
    showToast('Task approved! ✅', 'success');

    try {
      const token = sessionStorage.getItem('jwt-token');
      await axios.patch(`/tasks/${taskId}`, { approval_status: 'approved' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      refreshData();
      showToast('Failed to approve task', 'error');
    }
  };

  const handleTaskApproval = async (taskId: string, action: 'approve' | 'reject') => {
    try {
      const token = sessionStorage.getItem('jwt-token');
      if (action === 'approve') {
        await axios.post(`/tasks/${taskId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setPendingTaskApprovals(prev => prev.filter(t => t._id !== taskId));
        showToast('Task approved! ✅', 'success');
      } else {
        await axios.patch(`/tasks/${taskId}`, { approval_status: 'rejected' }, { headers: { Authorization: `Bearer ${token}` } });
        setPendingTaskApprovals(prev => prev.filter(t => t._id !== taskId));
        showToast('Task rejected ❌', 'success');
      }
    } catch (err: any) {
      showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) return;
    await handleRejectTask(rejectingTaskId, rejectionReason.trim());
    setShowRejectModal(false);
    setRejectionReason('');
    setRejectingTaskId('');
  };

  const handleUserApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const token = sessionStorage.getItem('jwt-token');
      await axios.post('/auth/admin/user-action', { userId, action }, { headers: { Authorization: `Bearer ${token}` } });
      setPendingUsers(prev => prev.map(u => (u._id || u.id) === userId
        ? { ...u, account_status: action === 'approve' ? 'active' : 'rejected' }
        : u
      ));
      showToast(`User ${action === 'approve' ? 'approved ✅' : 'rejected ❌'}`, 'success');
    } catch (err: any) {
      showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleUserToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setPendingUsers(prev => prev.map(u => (u._id || u.id) === userId ? { ...u, account_status: newStatus } : u));
    try {
      const token = sessionStorage.getItem('jwt-token');
      await axios.post('/auth/admin/toggle-user-status', { userId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err: any) {
      setPendingUsers(prev => prev.map(u => (u._id || u.id) === userId ? { ...u, account_status: currentStatus } : u));
      showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleUserRemoval = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    setPendingUsers(prev => prev.filter(u => (u._id || u.id) !== userId));
    try {
      const token = sessionStorage.getItem('jwt-token');
      await axios.delete(`/auth/admin/remove-user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('User removed', 'success');
    } catch (err: any) {
      refreshData();
      showToast('Error: ' + (err.response?.data?.message || err.message), 'error');
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

  // Filter tasks based on search, status, priority, date range, assigned by, assigned to
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchDebounce.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchDebounce.toLowerCase());
    const effectiveStatus = task.rejectionReason ? 'Working on it' :
      task.status === 'Pending Approval' ? 'Working on it' :
      !['Not Started', 'Working on it', 'Stuck', 'Done'].includes(task.status) ? 'Working on it' : task.status;
    const matchesStatus = filterStatus === 'all' || effectiveStatus === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority.toString() === filterPriority;
    
    // Date range filter
    let matchesDateRange = true;
    if (filterDateRange !== 'all' && task.dueDate) {
      const taskDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filterDateRange === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        matchesDateRange = taskDate >= today && taskDate < tomorrow;
      } else if (filterDateRange === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        matchesDateRange = taskDate >= today && taskDate < weekFromNow;
      } else if (filterDateRange === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        matchesDateRange = taskDate >= today && taskDate < monthFromNow;
      }
    }
    
    // Assigned By filter
    let matchesAssignedBy = true;
    if (filterAssignedBy !== 'all') {
      const assignedById = typeof task.assignedBy === 'object' ? task.assignedBy?._id : task.assignedBy;
      matchesAssignedBy = String(assignedById) === filterAssignedBy;
    }
    
    // Assigned To filter
    let matchesAssignedTo = true;
    if (filterAssignedTo !== 'all') {
      if (Array.isArray(task.assignedTo)) {
        matchesAssignedTo = task.assignedTo.some(u => {
          const userId = typeof u === 'object' ? u._id : u;
          return String(userId) === filterAssignedTo;
        });
      } else {
        const assignedToId = typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo;
        matchesAssignedTo = String(assignedToId) === filterAssignedTo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDateRange && matchesAssignedBy && matchesAssignedTo;
  });

  // Tasks Board: show tasks where user is an assignee (including self-assigned tasks)
  const tasksAssignedToMe = filteredTasks.filter(task => {
    if (Array.isArray(task.assignedTo)) {
      return task.assignedTo.some(u => {
        const uId = typeof u === 'object' ? (u._id || u.id) : u;
        return String(uId) === String(user._id);
      });
    }
    const assignedToId = typeof task.assignedTo === 'object' ? (task.assignedTo._id || task.assignedTo.id) : task.assignedTo;
    return String(assignedToId) === String(user._id);
  });

  // Task List: For regular users show only their tasks, for admin show all company tasks
  const taskListTasks = user.role === 'admin' ? filteredTasks : tasksAssignedToMe;

  // Get unique users who have tasks assigned
  Array.from(new Set(
    tasks.flatMap(task => {
      if (Array.isArray(task.assignedTo)) {
        return task.assignedTo.map(u => typeof u === 'object' ? u._id : u);
      }
      return typeof task.assignedTo === 'object' ? [task.assignedTo._id] : [task.assignedTo];
    })
  )).map(userId => users.find(u => u._id === userId)).filter(Boolean) as User[]; // usersWithTasks (unused)

  // Format timestamp (relative for recent, absolute for old)
  const formatTimestamp = (date: string | undefined) => {
    if (!date) return '';
    const now = new Date();
    const taskDate = new Date(date);
    const diffMs = now.getTime() - taskDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 2) return `${diffDays}d ago`;
    return taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate completion percentages for users
  const getUserCompletionStats = (userId: string) => {
    console.log('Getting stats for user:', userId);
    console.log('All tasks:', tasks.length);
    
    const tasksTo = tasks.filter(t => {
      if (Array.isArray(t.assignedTo)) {
        return t.assignedTo.some(u => {
          const uId = typeof u === 'object' ? (u._id || u.id) : u;
          return String(uId) === String(userId);
        });
      }
      const assignedToId = typeof t.assignedTo === 'object' ? (t.assignedTo._id || t.assignedTo.id) : t.assignedTo;
      return String(assignedToId) === String(userId);
    });
    
    const tasksBy = tasks.filter(t => {
      const assignedById = typeof t.assignedBy === 'object' ? (t.assignedBy?._id || t.assignedBy?.id) : t.assignedBy;
      return String(assignedById) === String(userId);
    });
    
    console.log('Tasks TO user:', tasksTo.length);
    console.log('Tasks BY user:', tasksBy.length);
    
    const completedTo = tasksTo.filter(t => t.status === 'Done').length;
    const completedBy = tasksBy.filter(t => t.status === 'Done').length;
    
    return {
      toCount: tasksTo.length,
      toCompleted: completedTo,
      toPercentage: tasksTo.length > 0 ? Math.round((completedTo / tasksTo.length) * 100) : 0,
      byCount: tasksBy.length,
      byCompleted: completedBy,
      byPercentage: tasksBy.length > 0 ? Math.round((completedBy / tasksBy.length) * 100) : 0
    };
  };

  const kanbanColumns = ["Not Started", "Working on it", "Stuck", "Done"];
  const getKanbanTasks = (): KanbanTasksType => {
    const columns: KanbanTasksType = {};
    kanbanColumns.forEach(col => columns[col] = []);
    console.log('🔍 KANBAN DEBUG - tasksAssignedToMe:', tasksAssignedToMe.map(t => ({
      id: t._id, title: t.title, status: t.status,
      approvalStatus: t.approvalStatus, rejectionReason: t.rejectionReason,
      assignedTo: t.assignedTo, assignedBy: t.assignedBy
    })));
    tasksAssignedToMe.forEach(task => {
      let status = task.status;
      const originalStatus = task.status;
      if (task.rejectionReason) status = 'Working on it';
      else if (status === 'Pending Approval') status = 'Working on it';
      if (!(status in columns)) status = 'Working on it';
      console.log(`🔍 KANBAN DEBUG - task "${task.title}" → column: "${status}" | originalStatus: "${originalStatus}" | rejectionReason: "${task.rejectionReason}" | approvalStatus: "${task.approvalStatus}"`);
      columns[status].push({ ...task, status });
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
      setFilterStatus('all'); // reset filter so moved task stays visible
      await updateTaskStatus(draggedTask._id, destCol);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  const totalTasks = tasksAssignedToMe.length;
  const doneTasks = tasksAssignedToMe.filter(t => t.status === "Done").length;
  const inProgressTasks = tasksAssignedToMe.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasksAssignedToMe.filter(t => t.status === "Stuck").length;

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
              {user.role === 'admin' ? ' Admin' : ' User'} • {user.organization?.name || 'No Organization'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <label style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              style={{ padding: "6px 32px 6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, minWidth: 200, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: 16,
                  padding: 4
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFilter />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              <option value="all">All Status</option>
              <option value="Not Started">Not Started</option>
              <option value="Working on it">Working on it</option>
              <option value="Stuck">Stuck</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              <option value="all">All Priority</option>
              <option value="5">⭐⭐⭐⭐⭐ High</option>
              <option value="4">⭐⭐⭐⭐ Medium-High</option>
              <option value="3">⭐⭐⭐ Medium</option>
              <option value="2">⭐⭐ Low-Medium</option>
              <option value="1">⭐ Low</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Sort:</label>
            <select
              value={kanbanSort}
              onChange={e => setKanbanSort(e.target.value as "none" | "priority" | "date")}
              style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              <option value="none">None</option>
              <option value="priority">Priority</option>
              <option value="date">Due Date</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
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
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Click if task status changed</span>
          </div>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container" style={{ display: "flex", gap: 16, overflowX: "auto" }}>
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
                        minWidth: "280px",
                        flex: 1,
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
                              title={task.rejectionReason ? `Rejected: ${task.rejectionReason}` : ''}
                              style={{
                                background: task.rejectionReason ? '#fee2e2' : isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#fff",
                                border: task.rejectionReason ? '2px solid #fca5a5' : isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
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
                              <>
                              
                              {/* Approved Green Tick - only show when creator explicitly approved */}
                              {task.approvalStatus === 'approved' && (task as any).approved_at && (
                                <div style={{ position: 'absolute', top: 8, right: 8, color: '#22c55e', fontSize: 18, fontWeight: 'bold' }}>✓</div>
                              )}
                              
                              {/* Pending Badge */}
                              {(task as any).approvalStatus === 'pending' && (
                                <div style={{ 
                                  position: 'absolute', 
                                  top: 8, 
                                  right: 8, 
                                  background: '#fef3c7', 
                                  color: '#92400e', 
                                  padding: '2px 8px', 
                                  borderRadius: 12, 
                                  fontSize: 10, 
                                  fontWeight: 600,
                                  border: '1px solid #f59e0b'
                                }}>
                                  PENDING
                                </div>
                              )}
                              
                              {/* Approved Tick Mark - Only show in Done column */}
                              {task.status === 'Done' && (task as any).approvalStatus === 'approved' && (
                                <div style={{ position: 'absolute', top: 8, right: 8, color: '#22c55e', fontSize: 20, fontWeight: 'bold' }}>✓</div>
                              )}
                              
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
                              {task.rejectionReason && (
                                <div style={{
                                  fontSize: 12,
                                  color: '#dc2626',
                                  background: '#fee2e2',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  marginBottom: 6,
                                  border: '1px solid #fca5a5'
                                }}>
                                  <b>❌ Rejected:</b> {task.rejectionReason}
                                </div>
                              )}
                              {task.stuckReason && task.status === 'Stuck' && (
                                <div style={{
                                  fontSize: 12,
                                  color: '#d97706',
                                  background: '#fef3c7',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  marginBottom: 6,
                                  border: '1px solid #f59e0b'
                                }}>
                                  <b>⚠️ Stuck:</b> {task.stuckReason}
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

                              {task.createdAt && (
                                <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 4 }}>
                                  Created {formatTimestamp(task.createdAt)}
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
                              </>
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
          <FaTasks style={{ marginRight: 8 }} /> {user.role === 'admin' ? 'All Company Tasks' : 'My Tasks'} ({taskListTasks.length})
        </div>
        
        {/* Filters */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: 'wrap' }}>
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <select
            value={filterAssignedBy}
            onChange={(e) => setFilterAssignedBy(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Assigned By</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
            ))}
          </select>
          
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Assigned To</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Status</option>
            <option value="Not Started">Not Started</option>
            <option value="Working on it">Working on it</option>
            <option value="Stuck">Stuck</option>
            <option value="Done">Done</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Priority</option>
            <option value="5">⭐⭐⭐⭐⭐ High</option>
            <option value="4">⭐⭐⭐⭐ Medium-High</option>
            <option value="3">⭐⭐⭐ Medium</option>
            <option value="2">⭐⭐ Low-Medium</option>
            <option value="1">⭐ Low</option>
          </select>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {taskListTasks.map(task => (
            <div key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#fff",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 1px 4px #c7d2fe22",
              position: "relative"
            }}>
              {(task as any).approvalStatus === 'pending' && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, border: '1px solid #f59e0b' }}>
                  PENDING APPROVAL
                </div>
              )}
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
              {task.assignedBy && (
                <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : '#555', marginBottom: 3 }}>
                  <b>Assigned By:</b>{' '}
                  {typeof task.assignedBy === 'object' ? task.assignedBy.name : users.find(u => (u._id || u.id) === task.assignedBy)?.name || 'Unknown'}
                </div>
              )}
              {task.assignedTo && (
                <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : '#555', marginBottom: 3 }}>
                  <b>Assigned To:</b>{' '}
                  {Array.isArray(task.assignedTo)
                    ? task.assignedTo.map(u => typeof u === 'object' ? u.name : users.find(user => (user._id || user.id) === u)?.name || u).join(', ')
                    : typeof task.assignedTo === 'object' && task.assignedTo !== null
                    ? task.assignedTo.name
                    : users.find(u => (u._id || u.id) === task.assignedTo)?.name || 'Unknown'}
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
        
        {taskListTasks.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, marginTop: 40 }}>
            No tasks found. Create your first task!
          </div>
        )}
      </div>
    );
  } else if (nav === "completed") {
    // Completed Tasks View - only show tasks that are Done
    const completedTasksList = user.role === 'admin' ? filteredTasks.filter(t => t.status === "Done" || t.status === "Pending Approval") : tasksAssignedToMe.filter(t => t.status === "Done" || t.status === "Pending Approval");
    
    // Filter out approved tasks older than 24 hours
    const filteredCompletedTasks = completedTasksList.filter(task => {
      const taskAssignedBy = typeof task.assignedBy === 'object' ? task.assignedBy?._id : task.assignedBy;
      const isCreator = taskAssignedBy === user._id || taskAssignedBy === user.id;
      const isApproved = (task as any).approvalStatus === 'approved' || (task as any).approval_status === 'approved';
      
      // If not creator, show all tasks
      if (!isCreator) return true;
      
      // If not approved, show it
      if (!isApproved) return true;
      
      // If approved, show it (no time limit for now)
      return true;
    });
    
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
           {user.role === 'admin' ? 'All Completed Tasks' : 'My Completed Tasks'} ({completedTasksList.length})
        </div>
        
        {/* Filters */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: 'wrap' }}>
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <select
            value={filterAssignedBy}
            onChange={(e) => setFilterAssignedBy(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Assigned By</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
            ))}
          </select>
          
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Assigned To</option>
            {users.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
            ))}
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            <option value="all">All Priority</option>
            <option value="5">⭐⭐⭐⭐⭐ High</option>
            <option value="4">⭐⭐⭐⭐ Medium-High</option>
            <option value="3">⭐⭐⭐ Medium</option>
            <option value="2">⭐⭐ Low-Medium</option>
            <option value="1">⭐ Low</option>
          </select>
        </div>
        
        <div style={{ background: theme === 'dark' ? "#22c55e22" : "#f0fdf4", border: "1px solid #22c55e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ color: "#22c55e", fontWeight: 600 }}>
             Great job! You've completed {filteredCompletedTasks.length} tasks
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filteredCompletedTasks.map(task => {
            const taskAssignedBy = typeof task.assignedBy === 'object' ? task.assignedBy?._id : task.assignedBy;
            const isCreator = taskAssignedBy === user._id || taskAssignedBy === user.id;
            // Check both camelCase and snake_case for approval status
            const isApproved = (task as any).approvalStatus === 'approved' || (task as any).approval_status === 'approved';
            
            return (
              <div key={task._id} style={{
                background: isApproved ? (theme === 'dark' ? "#064e3b" : "#d1fae5") : (theme === 'dark' ? "#4b5563" : "#f9fafb"),
                border: isApproved ? "2px solid #10b981" : "1.5px solid #22c55e",
                borderRadius: 10,
                padding: 16,
                boxShadow: isApproved ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "0 1px 4px #22c55e22",
                position: "relative",
                opacity: isApproved ? 1 : 0.9
              }}>
                {isApproved && (
                  <div style={{ position: "absolute", top: 8, right: 8, color: "#22c55e", fontSize: 20 }}>✓</div>
                )}
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
                  display: "inline-block",
                  marginBottom: 8
                }}>
                  Done
                </div>
                
                {isCreator && !isApproved && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => handleApproveTask(task._id)}
                      style={{
                        flex: 1,
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason && reason.trim()) {
                          handleRejectTask(task._id, reason.trim());
                        }
                      }}
                      style={{
                        flex: 1,
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {filteredCompletedTasks.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, marginTop: 40 }}>
            No completed tasks yet. Keep working! 💪
          </div>
        )}
      </div>
    );
  } else if (nav === "calendar") {
    // Calendar View
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><FaCalendarAlt style={{ marginRight: 8 }} /> Calendar</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <select
              value={calendarMonth}
              onChange={(e) => setCalendarMonth(Number(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </select>
            <select
              value={calendarYear}
              onChange={(e) => setCalendarYear(Number(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`, background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
          {dayNames.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 14, padding: 8 }}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: 38 }} />
          ))}
          {calendarDates.map(day => {
            const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
            const isSelected = selectedDate === day.toString();
            const hasTasks = tasksAssignedToMe.some(t => t.dueDate && new Date(t.dueDate).getDate() === day && new Date(t.dueDate).getMonth() === calendarMonth && new Date(t.dueDate).getFullYear() === calendarYear);
            
            return (
              <div
                key={day}
                onClick={() => setSelectedDate(day.toString())}
                className="calendar-day"
                style={{
                  height: 38,
                  lineHeight: '38px',
                  textAlign: 'center',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? '#2563eb' : isToday ? '#dbeafe' : theme === 'dark' ? '#4b5563' : '#f3f4f6',
                  color: isSelected ? '#fff' : theme === 'dark' ? '#ffffff' : '#1f2937',
                  fontWeight: isToday || isSelected ? 700 : 500,
                  fontSize: 14,
                  border: isToday && !isSelected ? '2px solid #2563eb' : 'none',
                  position: 'relative'
                }}
              >
                {day}
                {hasTasks && (
                  <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#ef4444' }} />
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            Tasks for {monthNames[calendarMonth]} {selectedDate}, {calendarYear}:
          </div>
          {tasksAssignedToMe.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate && new Date(t.dueDate).getMonth() === calendarMonth && new Date(t.dueDate).getFullYear() === calendarYear).length === 0 && (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center', background: theme === 'dark' ? '#4b5563' : '#f8fafc', borderRadius: 8 }}>No tasks for this day.</div>
          )}
          {tasksAssignedToMe.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate && new Date(t.dueDate).getMonth() === calendarMonth && new Date(t.dueDate).getFullYear() === calendarYear).map(task => (
            <div key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#f9fafb",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              boxShadow: "0 1px 4px #c7d2fe22",
              cursor: 'pointer'
            }} onClick={() => {
              setSelectedTaskDetails(task);
              setShowTaskDetailsModal(true);
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
          style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Company</label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company Name"
          style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          required
          style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
        />
        <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Assign To (Multiple)</label>
        <div style={{
          border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`,
          borderRadius: 8,
          padding: 12,
          maxHeight: 200,
          overflowY: 'auto',
          background: theme === 'dark' ? '#1f2937' : '#fff'
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
                  checked={assignedTo.includes(String(u._id || u.id))}
                  onChange={(e) => {
                    const userId = String(u._id || u.id);
                    if (e.target.checked) {
                      setAssignedTo([...assignedTo, userId]);
                    } else {
                      setAssignedTo(assignedTo.filter(id => id !== userId));
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
          style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }} 
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
              setTitle(''); setDescription(''); setAssignedTo([]); setPriority(3); setDueDate(new Date().toISOString().split('T')[0]); setCompany('');
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
      const col = task.status === 'Pending Approval' ? 'Done' : task.status;
      assignedKanbanTasks[col] = assignedKanbanTasks[col] || [];
      assignedKanbanTasks[col].push({ ...task, status: col });
    });

    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: theme === 'dark' ? '#ffffff' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span><FaUser style={{ marginRight: 8 }} /> Tasks You Assigned ({assignedTasks.length})</span>
        <button
          type="button"
          onClick={refreshData}
          disabled={isRefreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: isRefreshing ? 'not-allowed' : 'pointer', opacity: isRefreshing ? 0.7 : 1, fontSize: 13 }}
        >
          <FaSync className={isRefreshing ? 'fa-spin' : ''} /> Refresh
        </button>
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
              {assignedKanbanTasks[col].map(task => {
                const taskKey = task._id || (task as any).id;
                const approvalStatus = (task as any).approvalStatus || (task as any).approval_status;
                const isDone = task.status === 'Done';
                const needsApproval = isDone && (!approvalStatus || approvalStatus === 'pending');
                const isApproved = isDone && approvalStatus === 'approved';
                
                return (
                <div key={taskKey} style={{
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteTask(task._id);
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
                  
                  {/* Show status badge or approve/reject buttons */}
                  {needsApproval ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveTask(task._id);
                        }}
                        style={{
                          flex: 1,
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const reason = prompt('Enter rejection reason:');
                          if (reason && reason.trim()) {
                            handleRejectTask(task._id, reason.trim());
                          }
                        }}
                        style={{
                          flex: 1,
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  ) : (
                    <>
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
                      {isApproved && (
                        <span style={{ marginLeft: 8, color: "#22c55e", fontSize: 16, fontWeight: 'bold' }}>✓ Approved</span>
                      )}
                    </>
                  )}
                  
                  {task.completionRemark && (
                    <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : "#666", marginTop: 8 }}>
                      <b>Remark:</b> {task.completionRemark}
                    </div>
                  )}
                  
                  {task.rejectionReason && (
                    <div style={{
                      fontSize: 12,
                      color: '#dc2626',
                      background: '#fee2e2',
                      padding: '8px',
                      borderRadius: 6,
                      marginTop: 8,
                      border: '1px solid #fca5a5'
                    }}>
                      <b>❌ Rejection Reason:</b><br/>
                      {task.rejectionReason}
                    </div>
                  )}
                  {task.stuckReason && (
                    <div style={{
                      fontSize: 12,
                      color: '#d97706',
                      background: '#fef3c7',
                      padding: '8px',
                      borderRadius: 6,
                      marginTop: 8,
                      border: '1px solid #f59e0b'
                    }}>
                      <b>⚠️ Stuck Reason:</b><br/>
                      {task.stuckReason}
                    </div>
                  )}
                </div>
                );
              })}
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
  } else if (nav === "adduser" && user.role === 'admin') {
    // Add User for Admin
    const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setAddUserLoading(true);
      
      try {
        const token = sessionStorage.getItem("jwt-token");
        await axios.post("/auth/admin/create-user", {
          name: newUserName,
          email: newUserEmail,
          userId: newUserUserId,
          password: newUserPassword
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        showToast("User created successfully! 🎉", "success");
        setNewUserName("");
        setNewUserEmail("");
        setNewUserUserId("");
        setNewUserPassword("");
        
        // Refresh users list
        const res = await axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data);
      } catch (err: any) {
        showToast("Error: " + (err.response?.data?.message || err.message), "error");
      } finally {
        setAddUserLoading(false);
      }
    };
    
    content = (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{
          background: theme === 'dark' ? "#374151" : "#fff",
          boxShadow: "0 4px 24px #c7d2fe33",
          borderRadius: 16,
          padding: 32
        }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#2563eb", marginBottom: 24 }}>👥 Add New User</div>
          
          <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>User Name</label>
              <input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Full Name"
                required
                style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
              />
            </div>
            
            <div>
              <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@company.com"
                required
                style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
              />
            </div>
            
            <div>
              <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>User ID</label>
              <input
                value={newUserUserId}
                onChange={(e) => setNewUserUserId(e.target.value)}
                placeholder="username"
                required
                style={{ padding: 12, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Password</label>
              <input
                type={showNewUserPassword ? "text" : "password"}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password"
                required
                style={{ padding: 12, paddingRight: 45, border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`, borderRadius: 8, width: "100%", background: theme === 'dark' ? '#1f2937' : '#fff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
              />
              <button
                type="button"
                onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '32px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '16px'
                }}
              >
                {showNewUserPassword ? '👁️' : '👁️🗨️'}
              </button>
            </div>
            
            <button type="submit" disabled={addUserLoading} style={{
              fontWeight: 600, fontSize: "1.1rem", background: addUserLoading ? "#ccc" : "#2563eb",
              color: "#fff", padding: "12px 24px", borderRadius: 8, border: "none",
              cursor: addUserLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, marginTop: 8
            }}>
              {addUserLoading ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  Creating User...
                </>
              ) : (
                "Add User"
              )}
            </button>
          </form>
          
          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            background: theme === 'dark' ? "#1f2937" : "#f0f9ff", 
            borderRadius: 8, 
            border: "1px solid #3b82f6" 
          }}>
            <div style={{ color: "#3b82f6", fontWeight: 600, marginBottom: 8 }}>
              📝 Add User Information:
            </div>
            <div style={{ color: theme === 'dark' ? '#d1d5db' : "#64748b", fontSize: 14 }}>
              • Users will be added directly to your company<br/>
              • They can login immediately with the provided credentials<br/>
              • Users will have access to the task management system<br/>
              • You can assign tasks to them once they're created
            </div>
          </div>
        </div>
      </div>
    );
  } else if (nav === "userapprovals" && user.role === 'admin') {
    // User Approvals for Admin
    content = (
      <div style={{ background: theme === 'dark' ? "#374151" : "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22" }}>
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
                    background: "#fef3c7", 
                    color: "#92400e", 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    fontSize: 11, 
                    fontWeight: 600,
                    border: "1px solid #f59e0b"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
            👥 User Management ({pendingUsers.length})
          </div>
          <button
            onClick={() => setNav('adduser')}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FaPlus /> Add User
          </button>
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
                    <b>User ID:</b> {pendingUser.userId || (pendingUser as any).user_id || pendingUser._id}
                  </div>
                  
                  <div style={{ fontSize: 14, color: "#2563eb", marginBottom: 8 }}>
                    <b>Status:</b> {pendingUser.account_status || 'Unknown'}
                  </div>
                  
                  {(() => {
                    const stats = getUserCompletionStats(String(pendingUser._id || pendingUser.id));
                    return (
                      <div style={{ marginTop: 12, padding: 12, background: theme === 'dark' ? '#1f2937' : '#f0f9ff', borderRadius: 8, fontSize: 13 }}>
                        <div style={{ marginBottom: 6, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                          <b>Tasks TO:</b> {stats.toCompleted}/{stats.toCount} ({stats.toPercentage}%)
                        </div>
                        <div style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                          <b>Tasks BY:</b> {stats.byCompleted}/{stats.byCount} ({stats.byPercentage}%)
                        </div>
                      </div>
                    );
                  })()}
                  
                  <button
                    onClick={() => {
                      setSelectedUserForTasks(pendingUser);
                      setShowUserTasksModal(true);
                    }}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #2563eb',
                      background: 'transparent',
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    👁️ View Tasks
                  </button>
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleUserApproval(String(pendingUser.id || pendingUser._id), 'approve')}
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
                          onClick={() => handleUserApproval(String(pendingUser.id || pendingUser._id), 'reject')}
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
                        onClick={() => handleUserToggle(String(pendingUser.id || pendingUser._id), pendingUser.account_status || 'pending')}
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
                        onClick={() => handleUserRemoval(String(pendingUser.id || pendingUser._id))}
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

  // Poll notifications every 15s — refresh tasks if new unread notification arrives
  const prevUnreadRef = React.useRef(unreadCount);
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = sessionStorage.getItem('jwt-token');
        const res = await axios.get(`/notifications/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
        const newNotifs: Notification[] = res.data;
        const newUnread = newNotifs.filter((n: Notification) => !n.isRead && !n.is_read).length;
        setNotifications(newNotifs);
        if (newUnread > prevUnreadRef.current) {
          // New notification arrived — refresh tasks so assignee sees updated status
          const tasksRes = await axios.get('/tasks/visible', { headers: { Authorization: `Bearer ${token}` } });
          setTasks(tasksRes.data.map(normalizeTask));
        }
        prevUnreadRef.current = newUnread;
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [user._id]);

  // Close mobile menu on navigation
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  }, [nav]);

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
          @media (max-width: 768px) {
            .desktop-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s ease;
            }
            .desktop-sidebar.mobile-open {
              transform: translateX(0);
              z-index: 1001;
            }
            .mobile-overlay {
              display: none;
            }
            .mobile-overlay.active {
              display: block;
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(0,0,0,0.5);
              z-index: 1000;
            }
          }
        `}
      </style>
      
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      <div 
        className={`desktop-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} 
        onMouseEnter={() => !isMobile && setIsSidebarExpanded(true)}
        onMouseLeave={() => !isMobile && setIsSidebarExpanded(false)}
        style={{
        width: isMobile ? '280px' : (isSidebarExpanded ? '280px' : '50px'),
        background: theme === 'dark' ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        boxShadow: theme === 'dark' ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.08)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s ease'
      }}>
        <div style={{
          padding: (isMobile || isSidebarExpanded) ? '32px 24px' : '20px 4px',
          borderBottom: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
          textAlign: 'center',
          background: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          transition: 'padding 0.3s ease'
        }}>
          <div style={{
            width: (isMobile || isSidebarExpanded) ? '80px' : '42px',
            height: (isMobile || isSidebarExpanded) ? '80px' : '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: (isMobile || isSidebarExpanded) ? '24px' : '16px',
            fontWeight: 'bold',
            margin: '0 auto 12px auto',
            transition: 'all 0.3s ease'
          }}>
            {getInitials(user.name)}
          </div>
          {(isMobile || isSidebarExpanded) && (
            <>
              <div style={{ fontWeight: '600', fontSize: '18px', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
                {user.name}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>{user.email}</div>
            </>
          )}
        </div>

        <div style={{ flex: 1, padding: '16px 0' }}>
          {[
            { key: 'profile', icon: FaUser, label: 'Profile' },
            { key: 'kanban', icon: FaColumns, label: 'Tasks Board' },
            { key: 'assigntasks', icon: FaPlus, label: 'Assign Tasks' },
            { key: 'assignedtasks', icon: FaUser, label: 'Tasks Assigned' },
            { key: 'list', icon: FaTasks, label: 'Task List' },
            { key: 'completed', icon: FaCheckCircle, label: 'Completed Tasks' },
            ...(user.role === 'admin' ? [
              { key: 'userapprovals', icon: FaUser, label: 'User Management' }
            ] : []),
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
                padding: (isMobile || isSidebarExpanded) ? '14px 24px' : '10px 4px',
                margin: (isMobile || isSidebarExpanded) ? '4px 12px' : '4px 4px',
                cursor: 'pointer',
                background: nav === key ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: nav === key ? '#fff' : (theme === 'dark' ? '#d1d5db' : '#4b5563'),
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                justifyContent: (isMobile || isSidebarExpanded) ? 'flex-start' : 'center'
              }}
            >
              <Icon size={(isMobile || isSidebarExpanded) ? 18 : 22} />
              {(isMobile || isSidebarExpanded) && <span style={{ fontWeight: nav === key ? '600' : '500' }}>{label}</span>}
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
              padding: (isMobile || isSidebarExpanded) ? '12px 16px' : '10px 4px',
              cursor: 'pointer',
              color: '#ef4444',
              fontWeight: '600',
              borderRadius: '12px',
              justifyContent: (isMobile || isSidebarExpanded) ? 'flex-start' : 'center'
            }}
          >
            <FaSignOutAlt size={(isMobile || isSidebarExpanded) ? 18 : 22} />
            {(isMobile || isSidebarExpanded) && <span>Logout</span>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? 0 : (isSidebarExpanded ? '280px' : '50px'), minHeight: '100vh', width: isMobile ? '100vw' : (isSidebarExpanded ? 'calc(100vw - 280px)' : 'calc(100vw - 50px)'), transition: 'all 0.3s ease' }}>
        <div style={{
          background: theme === 'dark' ? 'rgba(55, 65, 81, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderBottom: theme === 'dark' ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: theme === 'dark' ? '#ffffff' : '#1f2937',
              padding: 8
            }}
            className="mobile-hamburger"
          >
            ☰
          </button>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: theme === 'dark' ? '#ffffff' : '#1f2937',
            margin: 0
          }}>
            Task Management System
          </h1>

          <style>
            {`
              @media (max-width: 768px) {
                .mobile-hamburger {
                  display: block !important;
                }
                .desktop-sidebar ~ div {
                  margin-left: 0 !important;
                  width: 100vw !important;
                }
              }
            `}
          </style>

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
                aria-label="notifications"
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
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    const token = sessionStorage.getItem("jwt-token");
                    axios.patch(`/notifications/all/${user._id}/read`, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    }).then(() => refreshData()).catch(err => console.error('Error marking as read:', err));
                  }
                }}
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

        {/* Stuck Reason Modal */}
        {showStuckModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStuckModal(false);
              setStuckReason('');
              setStuckTaskId('');
            }
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px 0', color: theme === 'dark' ? '#ffffff' : '#1f2937', fontSize: 20 }}>⚠️ Task Stuck</h3>
              <p style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', marginBottom: 16, fontSize: 14 }}>
                Please provide a reason why this task is stuck:
              </p>
              <textarea
                value={stuckReason}
                onChange={(e) => setStuckReason(e.target.value)}
                placeholder="Enter reason..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`,
                  background: theme === 'dark' ? '#1f2937' : '#fff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => {
                    setShowStuckModal(false);
                    setStuckReason('');
                    setStuckTaskId('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                    color: theme === 'dark' ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStuckSubmit}
                  disabled={!stuckReason.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: stuckReason.trim() ? '#ef4444' : '#9ca3af',
                    color: '#fff',
                    cursor: stuckReason.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600
                  }}
                >
                  Mark as Stuck
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRejectModal(false);
              setRejectionReason('');
              setRejectingTaskId('');
            }
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px 0', color: theme === 'dark' ? '#ffffff' : '#1f2937', fontSize: 20 }}>❌ Reject Task</h3>
              <p style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', marginBottom: 16, fontSize: 14 }}>
                Please provide a reason for rejecting this task (required, max 200 characters):
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                maxLength={200}
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#ddd'}`,
                  background: theme === 'dark' ? '#1f2937' : '#fff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'right' }}>
                {rejectionReason.length}/200
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setRejectingTaskId('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                    color: theme === 'dark' ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={!rejectionReason.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: rejectionReason.trim() ? '#ef4444' : '#9ca3af',
                    color: '#fff',
                    cursor: rejectionReason.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600
                  }}
                >
                  Reject Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Tasks Modal */}
        {showUserTasksModal && selectedUserForTasks && (() => {
          const userId = selectedUserForTasks._id || selectedUserForTasks.id;
          console.log('Modal - Selected user ID:', userId);
          console.log('Modal - All tasks:', tasks.length);
          
          const userTasks = tasks.filter(t => {
            if (Array.isArray(t.assignedTo)) {
              const isAssignedTo = t.assignedTo.some(u => {
                const uId = typeof u === 'object' ? (u._id || u.id) : u;
                return String(uId) === String(userId);
              });
              if (isAssignedTo) return true;
            } else {
              const assignedToId = typeof t.assignedTo === 'object' ? (t.assignedTo._id || t.assignedTo.id) : t.assignedTo;
              if (String(assignedToId) === String(userId)) return true;
            }
            
            // Also check if user created the task
            const assignedById = typeof t.assignedBy === 'object' ? (t.assignedBy?._id || t.assignedBy?.id) : t.assignedBy;
            return String(assignedById) === String(userId);
          });
          
          console.log('Modal - User tasks found:', userTasks.length);
          const filteredUserTasks = userTasksFilter === 'all' ? userTasks : userTasks.filter(t => t.status === userTasksFilter);
          
          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }} onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUserTasksModal(false);
                setSelectedUserForTasks(null);
                setUserTasksFilter('all');
              }
            }}>
              <div style={{
                background: theme === 'dark' ? '#374151' : '#fff',
                borderRadius: 12,
                padding: 32,
                maxWidth: 900,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, color: theme === 'dark' ? '#ffffff' : '#1f2937', fontSize: 22 }}>
                    📋 Tasks for {selectedUserForTasks.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowUserTasksModal(false);
                      setSelectedUserForTasks(null);
                      setUserTasksFilter('all');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 28,
                      cursor: 'pointer',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ marginBottom: 20 }}>
                  <select
                    value={userTasksFilter}
                    onChange={(e) => setUserTasksFilter(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#dbeafe'}`,
                      background: theme === 'dark' ? '#1f2937' : '#fff',
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }}
                  >
                    <option value="all">All Tasks ({userTasks.length})</option>
                    <option value="Not Started">Not Started ({userTasks.filter(t => t.status === 'Not Started').length})</option>
                    <option value="Working on it">Working on it ({userTasks.filter(t => t.status === 'Working on it').length})</option>
                    <option value="Stuck">Stuck ({userTasks.filter(t => t.status === 'Stuck').length})</option>
                    <option value="Done">Done ({userTasks.filter(t => t.status === 'Done').length})</option>
                  </select>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {filteredUserTasks.map(task => (
                    <div
                      key={task._id}
                      style={{
                        background: theme === 'dark' ? '#4b5563' : '#f8fafc',
                        border: `1.5px solid ${statusColors[task.status]}`,
                        borderRadius: 10,
                        padding: 16,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedTaskDetails(task);
                        setShowTaskDetailsModal(true);
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#1f2937', marginBottom: 8 }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#6b7280', marginBottom: 8 }}>
                        {task.description}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: statusColors[task.status] + '22',
                        color: statusColors[task.status],
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {task.status}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                        {renderStars(task.priority)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredUserTasks.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                    No tasks found for this filter.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Task Details Modal */}
        {showTaskDetailsModal && selectedTaskDetails && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }} onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskDetailsModal(false);
              setSelectedTaskDetails(null);
            }
          }}>
            <div style={{
              background: theme === 'dark' ? '#374151' : '#fff',
              borderRadius: 12,
              padding: 32,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <h3 style={{ margin: 0, color: theme === 'dark' ? '#ffffff' : '#1f2937', fontSize: 22, flex: 1 }}>
                  📝 Task Details
                </h3>
                <button
                  onClick={() => {
                    setShowTaskDetailsModal(false);
                    setSelectedTaskDetails(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 28,
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Title</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#1f2937' }}>
                  {selectedTaskDetails.title}
                </div>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Description</div>
                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                  {selectedTaskDetails.description}
                </div>
              </div>
              
              {selectedTaskDetails.company && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Company</div>
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    {selectedTaskDetails.company}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                <div style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: statusColors[selectedTaskDetails.status] + '22',
                  color: statusColors[selectedTaskDetails.status],
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  {selectedTaskDetails.status}
                </div>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Priority</div>
                <div>{renderStars(selectedTaskDetails.priority)}</div>
              </div>
              
              {selectedTaskDetails.dueDate && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Due Date</div>
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    {new Date(selectedTaskDetails.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Assigned To</div>
                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                  {Array.isArray(selectedTaskDetails.assignedTo)
                    ? selectedTaskDetails.assignedTo.map(u => typeof u === 'object' ? u.name : users.find(user => user._id === u)?.name || u).join(', ')
                    : typeof selectedTaskDetails.assignedTo === 'object'
                    ? selectedTaskDetails.assignedTo.name
                    : users.find(u => u._id === selectedTaskDetails.assignedTo)?.name || 'Unknown'}
                </div>
              </div>
              
              {selectedTaskDetails.assignedBy && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Assigned By</div>
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    {typeof selectedTaskDetails.assignedBy === 'object'
                      ? selectedTaskDetails.assignedBy.name
                      : users.find(u => u._id === selectedTaskDetails.assignedBy)?.name || 'Unknown'}
                  </div>
                </div>
              )}
              
              {selectedTaskDetails.completionRemark && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Completion Remark</div>
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    {selectedTaskDetails.completionRemark}
                  </div>
                </div>
              )}
              
              {selectedTaskDetails.stuckReason && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Stuck Reason</div>
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    {selectedTaskDetails.stuckReason}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 24, padding: 16, background: theme === 'dark' ? '#1f2937' : '#f0f9ff', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Task History</div>
                <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                  • Current Status: {selectedTaskDetails.status}<br/>
                  {isOverdue(selectedTaskDetails) && '• Status: OVERDUE ⚠️'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="notifications-panel" style={{
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