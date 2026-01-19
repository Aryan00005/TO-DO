import React, { useEffect, useState } from "react";
import { FaCalendar, FaColumns, FaMoon, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaCheckCircle, FaPlus, FaChartBar, FaCalendarAlt } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/Toast";
import axios from "../api/axios";

interface Task {
  id: number;
  _id?: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string | any;
  assigned_to?: number;
  assignedBy?: string | any;
  assigned_by?: number;
  priority: number;
  dueDate?: string;
  due_date?: string;
  company?: string;
  stuckReason?: string;
  stuck_reason?: string;
  completionRemark?: string;
  completion_remark?: string;
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
  const [nav, setNav] =   ("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [stuckTaskId, setStuckTaskId] = useState('');
  const [stuckReason, setStuckReason] = useState('');
  const [sortBy, setSortBy] = useState('none');

  if (!user) return <div>Loading...</div>;

  useEffect(() => {
    axios.get(`/tasks/assignedTo/${user._id}`)
      .then(res => setTasks(res.data))
      .catch(err => console.error(err));
  }, [user._id]);

  const updateTaskStatus = async (taskId: string | number, newStatus: string, remark?: string) => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      const payload: any = { status: newStatus };
      if (remark) payload.remark = remark;

      await axios.patch(`/tasks/${taskId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state immediately
      setTasks(prev => prev.map(task => {
        const id = task.id || task._id;
        if (String(id) === String(taskId)) {
          return { ...task, status: newStatus, stuckReason: remark || task.stuckReason };
        }
        return task;
      }));

      setRefreshKey(prev => prev + 1);
      showToast(`Task moved to ${newStatus}!`, "success");
    } catch (err) {
      showToast("Failed to update task", "error");
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string | number) => {
    const id = String(taskId);
    setDraggedTask(id);
    e.dataTransfer.setData('text/plain', id);
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

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '280px' }}>
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

        <div style={{
          flex: 1,
          padding: '32px',
          overflow: 'auto',
          width: '100%'
        }}>
          <div>
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
                        return b.priority - a.priority;
                      } else if (sortBy === 'date') {
                        const aDate = a.dueDate || a.due_date;
                        const bDate = b.dueDate || b.due_date;
                        if (!aDate && !bDate) return 0;
                        if (!aDate) return 1;
                        if (!bDate) return -1;
                        return new Date(aDate).getTime() - new Date(bDate).getTime();
                      }
                      return 0;
                    })
                    .map((task) => {
                      const taskId = task.id || task._id;
                      const taskIdStr = String(taskId);
                      return (
                    <div
                      key={taskIdStr}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, taskId)}
                      onDragEnd={handleDragEnd}
                      onDoubleClick={() => {
                        const statuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];
                        const currentIndex = statuses.indexOf(task.status);
                        const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                        updateTaskStatus(taskId, nextStatus);
                      }}
                      style={{
                        background: theme === 'dark' ? '#4b5563' : '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        cursor: 'grab',
                        opacity: draggedTask === taskIdStr ? 0.5 : 1,
                        transform: draggedTask === taskIdStr ? 'rotate(5deg)' : 'rotate(0deg)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: theme === 'dark' ? '#fff' : '#1f2937',
                        marginBottom: '8px'
                      }}>
                        {task.title}
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
                        {(task.dueDate || task.due_date) && (
                          <div style={{ 
                            color: '#6b7280',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <FaCalendar style={{ marginRight: '4px' }} />
                            {new Date(task.dueDate || task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {task.status === 'Stuck' && (task.stuckReason || task.stuck_reason) && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          padding: '8px',
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#ef4444'
                        }}>
                          ⚠️ {task.stuckReason || task.stuck_reason}
                        </div>
                      )}
                    </div>
                  );
                    })})

                  {tasks.filter(task => task.status === col).length === 0 && (
                    <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                      No tasks
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <ToastContainer />

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
                  onClick={() => {
                    if (stuckReason.trim()) {
                      updateTaskStatus(stuckTaskId, 'Stuck', stuckReason.trim());
                      setShowStuckModal(false);
                      setStuckReason('');
                      setStuckTaskId('');
                    }
                  }}
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