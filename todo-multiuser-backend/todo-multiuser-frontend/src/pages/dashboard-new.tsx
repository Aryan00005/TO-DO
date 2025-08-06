import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
// Removed drag library import - using native HTML5 drag and drop
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaColumns, FaMoon, FaPlus, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaEdit } from "react-icons/fa";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate().toString());
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [stuckTaskId, setStuckTaskId] = useState('');
  const [stuckReason, setStuckReason] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (nav === "assignedtasks") {
      axios.get(`/tasks/assignedBy/${user._id}`)
        .then(res => {
          // Process assigned tasks to show actual assignee status
          const processedTasks = res.data.map((task: any) => {
            // For assigned tasks, show the status of the first assignee
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

  if (!user) return <div>Loading...</div>;

  useEffect(() => {
    const token = sessionStorage.getItem("jwt-token");
    axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data))
      .catch(() => setUsers([user]));
  }, []);

  useEffect(() => {
    axios.get(`/tasks/assignedTo/${user._id}`)
      .then(res => {
        // Process tasks to get user-specific status from assigneeStatuses
        const processedTasks = res.data.map((task: any) => {
          const userStatus = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user._id === user._id);
          return {
            ...task,
            status: userStatus?.status || task.status || 'Not Started',
            stuckReason: userStatus?.completionRemark || task.stuckReason || ''
          };
        });
        setTasks(processedTasks);
      })
      .catch(err => console.error(err));
  }, [user._id]);

  // Fetch notifications
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

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.patch(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.patch(`/notifications/all/${user._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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
        assignedTo: [assignedTo], // Backend expects array
        priority,
        dueDate,
        company: company.trim() || undefined
      };
      
      await axios.post("/tasks", taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTitle(""); setDescription(""); setAssignedTo(""); setPriority(5); setDueDate(""); setCompany("");
      
      // Refresh tasks
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      const processedTasks = res.data.map((task: any) => {
        const userStatus = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user._id === user._id);
        return {
          ...task,
          status: userStatus?.status || task.status || 'Not Started',
          stuckReason: userStatus?.completionRemark || task.stuckReason || ''
        };
      });
      setTasks(processedTasks);
      
      showToast("Task created successfully!", "success");
      setNav("kanban"); // Switch to kanban view
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
      
      // Refresh tasks from backend to get updated status
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      const processedTasks = res.data.map((task: any) => {
        const userStatus = task.assigneeStatuses?.find((s: any) => s.user.toString() === user._id || s.user._id === user._id);
        return {
          ...task,
          status: userStatus?.status || task.status || 'Not Started',
          stuckReason: userStatus?.completionRemark || task.stuckReason || ''
        };
      });
      setTasks(processedTasks);
      
      // Refresh notifications if task is completed
      if (newStatus === 'Done') {
        const token = sessionStorage.getItem("jwt-token");
        const res = await axios.get(`/notifications/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
      }
      
      showToast("Task status updated!", "success");
    } catch (err) {
      console.error("Error updating task:", err);
      showToast("Failed to update task", "error");
    }
  };

  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && draggedTask) {
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

  const renderStars = (value: number, onClick?: (v: number) => void) => {
    const getStarColor = (starIndex: number, currentValue: number) => {
      if (starIndex > currentValue) return "#e5e7eb"; // Gray for unselected
      // All filled stars show the same color based on the priority level
      if (currentValue === 1) return "#22c55e"; // All stars green for priority 1
      if (currentValue === 2) return "#eab308"; // All stars yellow for priority 2
      if (currentValue === 3) return "#f59e0b"; // All stars orange for priority 3
      if (currentValue === 4) return "#fb7185"; // All stars light red for priority 4
      return "#ef4444"; // All stars red for priority 5
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

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  let content = null;

  if (nav === "kanban") {
    content = (
      <div>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', color: theme === 'dark' ? '#fff' : '#000' }}>Sort by:</label>
          <select style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
            <option value="none">None</option>
            <option value="priority">Priority</option>
            <option value="date">Due Date</option>
          </select>
        </div>
        <div className="kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', width: '100%' }}>
          {["Not Started", "Working on it", "Stuck", "Done"].map(col => (
            <div
              key={col}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
              style={{
                background: theme === 'dark' ? 
                  'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : 
                  'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '20px',
                padding: '20px',
                margin: '-8px',
                boxShadow: theme === 'dark' ? 
                  '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 
                  '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                minHeight: '500px',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)',
                position: 'relative'
              }}
            >
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '800', 
                color: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e', 
                marginBottom: '20px', 
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span style={{ fontSize: '18px' }}>
                  {col === 'Not Started' ? '📝' : col === 'Working on it' ? '⚙️' : col === 'Stuck' ? '⚠️' : '✅'}
                </span>
                {col}
                <div style={{
                  background: `linear-gradient(135deg, ${col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e'} 0%, ${col === 'Not Started' ? '#475569' : col === 'Working on it' ? '#d97706' : col === 'Stuck' ? '#dc2626' : '#16a34a'} 100%)`,
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginLeft: 'auto'
                }}>
                  {tasks.filter(task => task.status === col).length}
                </div>
              </div>
              {tasks.filter(task => task.status === col).map((task) => {
                const isOverdue = task.dueDate && task.status !== 'Done' && new Date(task.dueDate) < new Date();
                return (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: isOverdue ? '#fff0f0' : (theme === 'dark' ? 
                        'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : 
                        'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'),
                      border: isOverdue ? '2px solid #ef4444' : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)'),
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '16px',
                      boxShadow: theme === 'dark' ? 
                        '0 8px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05) inset' : 
                        '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
                      backdropFilter: 'blur(10px)',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: draggedTask === task._id ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      opacity: draggedTask === task._id ? 0.5 : 1
                    }}
                  >
                            {/* Priority indicator line */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: `linear-gradient(90deg, ${task.priority >= 4 ? '#ef4444' : task.priority >= 3 ? '#f59e0b' : '#22c55e'} 0%, ${task.priority >= 4 ? '#dc2626' : task.priority >= 3 ? '#d97706' : '#16a34a'} 100%)`,
                              borderRadius: '16px 16px 0 0'
                            }} />
                            
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'flex-start',
                              marginBottom: '12px'
                            }}>
                              <div style={{ 
                                fontWeight: '700', 
                                fontSize: '16px', 
                                color: theme === 'dark' ? '#fff' : '#1f2937',
                                lineHeight: '1.4',
                                flex: 1
                              }}>
                                {task.title}
                              </div>
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginLeft: '12px'
                              }}>
                                {renderStars(task.priority)}
                              </div>
                            </div>
                            
                            <div style={{ 
                              color: theme === 'dark' ? '#d1d5db' : '#6b7280', 
                              marginBottom: '12px',
                              fontSize: '14px',
                              lineHeight: '1.5'
                            }}>
                              {task.description}
                            </div>
                            {/* Meta information */}
                            <div style={{ marginBottom: '16px' }}>
                              {task.company && (
                                <div style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  marginBottom: '8px'
                                }}>
                                  🏢 {task.company}
                                </div>
                              )}
                              {task.assignedBy && (
                                <div style={{ 
                                  color: '#6b7280',
                                  fontSize: '12px',
                                  marginBottom: '8px'
                                }}>
                                  <b>Assigned by:</b> {typeof task.assignedBy === 'object' ? task.assignedBy.name : users.find(u => u._id === task.assignedBy)?.name || 'Unknown'}
                                </div>
                              )}
                              {task.dueDate && (
                                <div style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#6b7280',
                                  fontSize: '13px',
                                  marginBottom: '8px'
                                }}>
                                  <FaCalendar style={{ marginRight: '6px', fontSize: '11px' }} />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            
                            {/* Stuck reason */}
                            {task.status === 'Stuck' && task.stuckReason && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                marginBottom: '12px'
                              }}>
                                <div style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '600', 
                                  color: '#ef4444',
                                  marginBottom: '4px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  ⚠️ BLOCKED
                                </div>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: theme === 'dark' ? '#fca5a5' : '#dc2626',
                                  lineHeight: '1.4'
                                }}>
                                  {task.stuckReason}
                                </div>
                              </div>
                            )}
                            
                            {/* Overdue warning */}
                            {isOverdue && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                marginBottom: '12px'
                              }}>
                                <div style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '600', 
                                  color: '#ef4444',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  ⚠️ OVERDUE
                                </div>
                              </div>
                            )}
                            
                            {/* Status badge */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                fontWeight: '600',
                                background: `linear-gradient(135deg, ${col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e'} 0%, ${col === 'Not Started' ? '#475569' : col === 'Working on it' ? '#d97706' : col === 'Stuck' ? '#dc2626' : '#16a34a'} 100%)`,
                                color: '#fff',
                                borderRadius: '20px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: `0 2px 8px ${col === 'Not Started' ? 'rgba(100, 116, 139, 0.3)' : col === 'Working on it' ? 'rgba(245, 158, 11, 0.3)' : col === 'Stuck' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                              }}>
                                {col === 'Not Started' ? '📝' : col === 'Working on it' ? '⚙️' : col === 'Stuck' ? '⚠️' : '✅'} {task.status}
                              </div>
                            </div>
                  </div>
                );
              })}
              {tasks.filter(task => task.status === col).length === 0 && (
                <div style={{ color: '#64748b', fontSize: '14px' }}>No tasks</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (nav === "list") {
    content = (
      <div>
        <h2 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '24px' }}>Task List</h2>
        {tasks.map(task => (
          <div key={task._id} style={{
            background: theme === 'dark' ? '#374151' : '#fff',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', margin: '0 0 8px 0' }}>{task.title}</h3>
                <p style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', margin: '0 0 8px 0' }}>{task.description}</p>
                {task.company && (
                  <p style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', margin: '0 0 8px 0', fontSize: '14px' }}>
                    <b>Company:</b> {task.company}
                  </p>
                )}
                <p style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '14px' }}>
                  Assignee: {(() => {
                    // Handle if assignedTo is already a populated user object with name
                    if (typeof task.assignedTo === 'object' && task.assignedTo !== null && task.assignedTo.name) {
                      return task.assignedTo.name;
                    }
                    
                    // Handle if assignedTo is an array (get first user)
                    if (Array.isArray(task.assignedTo)) {
                      const firstAssignee = task.assignedTo[0];
                      if (typeof firstAssignee === 'object' && firstAssignee?.name) {
                        return firstAssignee.name;
                      }
                      const user = users.find(u => u._id === firstAssignee);
                      return user?.name || 'Unknown User';
                    }
                    
                    // Handle if assignedTo is just an ID string
                    if (typeof task.assignedTo === 'string') {
                      const user = users.find(u => u._id === task.assignedTo);
                      return user?.name || 'Unknown User';
                    }
                    
                    return 'Unknown User';
                  })()}
                </p>
                {task.dueDate && (
                  <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '8px' }}>{renderStars(task.priority)}</div>
                <div style={{
                  background: (task.status === 'Done' ? '#22c55e' : task.status === 'Working on it' ? '#fbbf24' : task.status === 'Stuck' ? '#ef4444' : '#64748b') + '22',
                  color: task.status === 'Done' ? '#22c55e' : task.status === 'Working on it' ? '#fbbf24' : task.status === 'Stuck' ? '#ef4444' : '#64748b',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  {task.status}
                </div>
                {task.status !== 'Done' && (
                  <button 
                    onClick={() => updateTaskStatus(task._id, 'Done')}
                    style={{
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px' }}>
            No tasks found. Create your first task!
          </div>
        )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ background: '#3b82f6', color: '#fff', padding: '8px', borderRadius: '8px' }}>📝</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#1f2937', margin: 0 }}>
              Create New Task
            </h2>
          </div>
          
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#374151', marginBottom: '6px' }}>
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Presentation Test Task"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  outline: 'none'
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
                placeholder="Enter company name..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#4b5563' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  outline: 'none'
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
                placeholder="e.g., XYZ work "
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
                  outline: 'none',
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
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  outline: 'none'
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
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Click stars to set priority</div>
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
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  outline: 'none'
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
                gap: '8px',
                marginTop: '8px'
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
  } else if (nav === "calendar") {
    content = (
      <div style={{
        background: theme === 'dark' ? '#374151' : '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        maxWidth: '700px',
        margin: '0 auto'
      }}>
        <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '18px', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
          <FaCalendarAlt style={{ marginRight: '8px' }} /> Calendar
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {calendarDates.map(day => (
            <div
              key={day}
              onClick={() => setSelectedDate(day.toString())}
              style={{
                width: '38px', height: '38px', lineHeight: '38px', textAlign: 'center',
                borderRadius: '50%', cursor: 'pointer',
                background: selectedDate === day.toString() ? '#3b82f6' : '#e5e7eb',
                color: selectedDate === day.toString() ? '#fff' : '#1f2937',
                fontWeight: '600', fontSize: '16px'
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '16px', color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Tasks for Day {selectedDate}:
          </div>
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).map(task => (
            <div key={task._id} style={{
              background: theme === 'dark' ? '#4b5563' : '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <div style={{ fontWeight: '600', fontSize: '16px', color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '8px' }}>
                {task.title}
                <span style={{ float: 'right' }}>{renderStars(task.priority)}</span>
              </div>
              <div style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: '8px' }}>{task.description}</div>
              {task.company && (
                <div style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#555', marginBottom: '4px' }}>
                  <b>Company:</b> {task.company}
                </div>
              )}
              <div style={{
                background: (task.status === 'Done' ? '#22c55e' : task.status === 'Working on it' ? '#fbbf24' : task.status === 'Stuck' ? '#ef4444' : '#64748b') + '22',
                color: task.status === 'Done' ? '#22c55e' : task.status === 'Working on it' ? '#fbbf24' : task.status === 'Stuck' ? '#ef4444' : '#64748b',
                borderRadius: '8px',
                padding: '4px 12px',
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {task.status}
              </div>
            </div>
          ))}
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).length === 0 && (
            <div style={{ color: '#6b7280' }}>No tasks for this day.</div>
          )}
        </div>
      </div>
    );
  } else if (nav === "assignedtasks") {
    content = (
      <div>
        <h2 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', marginBottom: '24px' }}>Tasks You Assigned</h2>
        <div className="kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', width: '100%' }}>
          {["Not Started", "Working on it", "Stuck", "Done"].map(col => (
            <div 
              key={col}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
              style={{
                background: theme === 'dark' ? 
                  'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : 
                  'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '20px',
                padding: '20px',
                margin: '-8px',
                boxShadow: theme === 'dark' ? 
                  '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 
                  '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                minHeight: '500px',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)',
                position: 'relative'
              }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '800', 
                color: col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e', 
                marginBottom: '20px', 
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span style={{ fontSize: '18px' }}>
                  {col === 'Not Started' ? '📝' : col === 'Working on it' ? '⚙️' : col === 'Stuck' ? '⚠️' : '✅'}
                </span>
                {col}
                <div style={{
                  background: `linear-gradient(135deg, ${col === 'Not Started' ? '#64748b' : col === 'Working on it' ? '#f59e0b' : col === 'Stuck' ? '#ef4444' : '#22c55e'} 0%, ${col === 'Not Started' ? '#475569' : col === 'Working on it' ? '#d97706' : col === 'Stuck' ? '#dc2626' : '#16a34a'} 100%)`,
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginLeft: 'auto'
                }}>
                  {assignedTasks.filter(task => task.status === col).length}
                </div>
              </div>
              {assignedTasks.filter(task => task.status === col).map(task => (
                <div key={task._id} style={{
                  background: theme === 'dark' ? 
                    'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : 
                    'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '16px',
                  boxShadow: theme === 'dark' ? 
                    '0 8px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05) inset' : 
                    '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Priority indicator line */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, ${task.priority >= 4 ? '#ef4444' : task.priority >= 3 ? '#f59e0b' : '#22c55e'} 0%, ${task.priority >= 4 ? '#dc2626' : task.priority >= 3 ? '#d97706' : '#16a34a'} 100%)`,
                    borderRadius: '16px 16px 0 0'
                  }} />
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '16px', 
                      color: theme === 'dark' ? '#fff' : '#1f2937',
                      lineHeight: '1.4',
                      flex: 1
                    }}>
                      {task.title}
                    </div>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: '12px'
                    }}>
                      {renderStars(task.priority)}
                    </div>
                  </div>
                  
                  <div style={{ 
                    color: theme === 'dark' ? '#d1d5db' : '#6b7280', 
                    marginBottom: '12px',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {task.description}
                  </div>
                  
                  {/* Meta information */}
                  <div style={{ marginBottom: '16px' }}>
                    {task.company && (
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginBottom: '8px'
                      }}>
                        🏢 {task.company}
                      </div>
                    )}
                    <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                      <b>Assigned To:</b> {(() => {
                        // Handle if assignedTo is already a populated user object with name
                        if (typeof task.assignedTo === 'object' && task.assignedTo !== null && task.assignedTo.name) {
                          return task.assignedTo.name;
                        }
                        
                        // Handle if assignedTo is an array (get first user)
                        if (Array.isArray(task.assignedTo)) {
                          const firstAssignee = task.assignedTo[0];
                          if (typeof firstAssignee === 'object' && firstAssignee?.name) {
                            return firstAssignee.name;
                          }
                          const user = users.find(u => u._id === firstAssignee);
                          return user?.name || 'Unknown User';
                        }
                        
                        // Handle if assignedTo is just an ID string
                        if (typeof task.assignedTo === 'string') {
                          const user = users.find(u => u._id === task.assignedTo);
                          return user?.name || 'Unknown User';
                        }
                        
                        return 'Unknown User';
                      })()}
                    </div>
                    {task.dueDate && (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        color: '#6b7280',
                        fontSize: '13px',
                        marginBottom: '8px'
                      }}>
                        <FaCalendar style={{ marginRight: '6px', fontSize: '11px' }} />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {/* Stuck reason */}
                  {task.status === 'Stuck' && task.stuckReason && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: '#ef4444',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        ⚠️ BLOCKED
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: theme === 'dark' ? '#fca5a5' : '#dc2626',
                        lineHeight: '1.4'
                      }}>
                        {task.stuckReason}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button 
                      onClick={() => {
                        setTitle(task.title);
                        setDescription(task.description);
                        setCompany(task.company || "");
                        setAssignedTo(typeof task.assignedTo === "object" ? task.assignedTo._id : task.assignedTo);
                        setPriority(task.priority);
                        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
                        setNav('assigntasks');
                        showToast("Task loaded for editing!", "success");
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}>Edit</button>
                    <button 
                      onClick={() => {
                        setTitle(task.title + " (Copy)");
                        setDescription(task.description);
                        setCompany(task.company || "");
                        setAssignedTo(typeof task.assignedTo === "object" ? task.assignedTo._id : task.assignedTo);
                        setPriority(task.priority);
                        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
                        setNav('assigntasks');
                        showToast("Task copied for creation!", "success");
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
                      }}>Copy</button>
                    <button 
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this task?")) {
                          try {
                            const token = sessionStorage.getItem("jwt-token");
                            await axios.delete(`/tasks/${task._id}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const res = await axios.get(`/tasks/assignedBy/${user._id}`);
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
                            showToast("Task deleted successfully!", "success");
                          } catch (err: any) {
                            showToast("Failed to delete task: " + (err.response?.data?.message || err.message), "error");
                          }
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}>Delete</button>
                  </div>
                </div>
              ))}
              {assignedTasks.filter(task => task.status === col).length === 0 && (
                <div style={{ color: '#64748b', fontSize: '14px' }}>No tasks</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (nav === "profile") {
    content = (
      <div style={{
        background: theme === 'dark' ? '#374151' : '#fff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        maxWidth: '400px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '32px',
          fontWeight: 'bold',
          margin: '0 auto 24px auto'
        }}>
          {getInitials(user.name)}
        </div>
        <h2 style={{ color: theme === 'dark' ? '#fff' : '#1f2937', margin: '0 0 8px 0' }}>{user.name}</h2>
        <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>{user.email}</p>
        <button style={{
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600'
        }}>
          Edit Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Notification overlay */}
      {showNotifications && (createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999998,
            pointerEvents: 'auto'
          }}
          onClick={() => setShowNotifications(false)}
        />,
        document.body
      ) as React.ReactNode)}
      
      {/* Sidebar */}
      <div style={{
        width: '280px',
        background: theme === 'dark' ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100vh',
        boxShadow: theme === 'dark' ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.08)'
      }}>
        {/* Profile Section */}
        <div style={{
          padding: '32px 24px',
          borderBottom: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0',
          textAlign: 'center',
          background: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
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
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}>
              {getInitials(user.name)}
            </div>
            <button
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
            >
              <FaEdit />
            </button>
          </div>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '18px', 
            color: theme === 'dark' ? '#fff' : '#1f2937',
            marginTop: '12px'
          }}>
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
            { key: 'assignedtasks', icon: FaUser, label: 'Tasks Assigned' },
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
                background: nav === key ? 
                  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                  'transparent',
                color: nav === key ? '#fff' : (theme === 'dark' ? '#d1d5db' : '#4b5563'),
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                boxShadow: nav === key ? '0 4px 20px rgba(59, 130, 246, 0.3)' : 'none',
                transform: nav === key ? 'translateX(4px)' : 'translateX(0)'
              }}
              onMouseEnter={(e) => {
                if (nav !== key) {
                  (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(75, 85, 99, 0.5)' : 'rgba(59, 130, 246, 0.1)';
                  (e.target as HTMLElement).style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (nav !== key) {
                  (e.target as HTMLElement).style.background = 'transparent';
                  (e.target as HTMLElement).style.transform = 'translateX(0)';
                }
              }}
            >
              <Icon size={16} />
              <span style={{ fontWeight: nav === key ? '600' : '500' }}>{label}</span>
            </div>
          ))}
        </div>
        
        {/* Logout */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 0',
              cursor: 'pointer',
              color: '#ef4444',
              fontWeight: '500'
            }}
          >
            <FaSignOutAlt size={16} />
            <span>Logout</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{
          background: theme === 'dark' ? 'rgba(55, 65, 81, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: theme === 'dark' ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: theme === 'dark' ? '#ffffff' : '#1f2937',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            Task Management System
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: theme === 'dark' ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                border: 'none',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme === 'dark' ? '#fbbf24' : '#3b82f6',
                boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
            >
              {theme === 'light' ? <FaMoon size={22} /> : <FaSun size={22} />}
            </button>
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: theme === 'dark' ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: theme === 'dark' ? '#fbbf24' : '#3b82f6',
                  position: 'relative',
                  boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
              >
                <FaBell size={24} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                    animation: 'pulse 2s infinite'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (createPortal(
                <div style={{
                  position: 'fixed',
                  top: '80px',
                  right: '32px',
                  width: '400px',
                  maxHeight: '500px',
                  background: theme === 'dark' ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '16px',
                  boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.15)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(20px)',
                  zIndex: 999999,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '20px',
                    borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '700',
                      color: theme === 'dark' ? '#fff' : '#1f2937'
                    }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#3b82f6',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#6b7280'
                      }}>
                        <FaBell size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <div>No notifications yet</div>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => !notification.isRead && markNotificationAsRead(notification._id)}
                          style={{
                            padding: '16px 20px',
                            borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                            cursor: notification.isRead ? 'default' : 'pointer',
                            background: notification.isRead ? 'transparent' : (theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'),
                            position: 'relative',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!notification.isRead) {
                              (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!notification.isRead) {
                              (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';
                            }
                          }}
                        >
                          {!notification.isRead && (
                            <div style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#3b82f6'
                            }} />
                          )}
                          <div style={{
                            fontSize: '14px',
                            color: theme === 'dark' ? '#fff' : '#1f2937',
                            lineHeight: '1.5',
                            marginBottom: '4px',
                            paddingLeft: notification.isRead ? '0' : '16px'
                          }}>
                            {notification.message}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            paddingLeft: notification.isRead ? '0' : '16px'
                          }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>,
                document.body
              ) as React.ReactNode)}
            </div>
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
        
        {/* Floating Action Button */}
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100
        }}>
          <button
            onClick={() => setNav('assigntasks')}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1.1) rotate(90deg)';
              (e.target as HTMLElement).style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1) rotate(0deg)';
              (e.target as HTMLElement).style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4)';
            }}
            title="Ctrl+N for new task, Ctrl+K for kanban, Ctrl+D for dashboard"
          >
            <FaPlus size={20} />
          </button>
        </div>
        
        <ToastContainer />
        
        {/* Stuck Reason Modal */}
        {showStuckModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              background: theme === 'dark' ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              transform: 'scale(1)',
              animation: 'slideIn 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>⚠️</div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700',
                    color: theme === 'dark' ? '#fff' : '#1f2937'
                  }}>Task Stuck</h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>Please provide a reason why this task is stuck</p>
                </div>
              </div>
              
              <textarea
                value={stuckReason}
                onChange={(e) => setStuckReason(e.target.value)}
                placeholder="Describe what's blocking this task..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '16px',
                  border: theme === 'dark' ? '2px solid #4b5563' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  background: theme === 'dark' ? '#1f2937' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#1f2937',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => (e.target as HTMLElement).style.borderColor = '#3b82f6'}
                onBlur={(e) => (e.target as HTMLElement).style.borderColor = theme === 'dark' ? '#4b5563' : '#e5e7eb'}
              />
              
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowStuckModal(false);
                    setStuckReason('');
                    setStuckTaskId('');
                  }}
                  style={{
                    padding: '12px 24px',
                    border: theme === 'dark' ? '2px solid #4b5563' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = theme === 'dark' ? '#4b5563' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStuckSubmit}
                  disabled={!stuckReason.trim()}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    background: stuckReason.trim() ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#9ca3af',
                    color: '#fff',
                    cursor: stuckReason.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    boxShadow: stuckReason.trim() ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (stuckReason.trim()) {
                      (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (stuckReason.trim()) {
                      (e.target as HTMLElement).style.transform = 'translateY(0)';
                      (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }
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