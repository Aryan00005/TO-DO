import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DroppableProvided,
  type DropResult
} from "@hello-pangea/dnd";
import React, { useEffect, useState } from "react";
import AvatarEdit from "react-avatar-edit";
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaClock, FaColumns, FaMoon, FaPlus, FaSignOutAlt, FaStar, FaSun, FaTasks, FaUser, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";
import FloatingActionButton from "../components/FloatingActionButton";
import axios from "../api/axios";
import type { User } from "../types/User";
import { validateTask } from "../utils/validation";
import {
  Button, DashboardTitle, Form, Input, Label, Layout, Main, NavItem, 
  ProfileBox, Sidebar, Status, TaskCard, TaskDesc, TaskTitle, TopBar
} from "../components/StyledComponents";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  assignedTo: string | User;
  assignedBy?: string | User;
  priority: number;
  dueDate?: string;
  company?: string;
  completionRemark?: string;
  stuckReason?: string;
}

interface Notification {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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

const defaultLogo = (
  <svg width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill="#2563eb" />
    <text x="50%" y="54%" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" dy=".3em">T</text>
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [nav, setNav] = useState("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const [selectedDate, setSelectedDate] = useState<string>(today.getDate().toString());

  if (!user || !user._id) {
    return <div>Loading user...</div>;
  }

  // Organization validation and setup
  if (!user.organization || !user.organization.name) {
    console.log('⚠️ User missing organization data:', user._id);
    // Set default organization to prevent UI break
    user.organization = { 
      name: user._id === 'jayraj' ? 'RLA' : user._id === 'testadmin' ? 'TestCorp' : 'Task Management', 
      type: 'company' 
    };
  }
  
  console.log('🏢 Using organization:', user.organization.name);

  useEffect(() => {
    const token = sessionStorage.getItem("jwt-token");
    console.log('🔄 Fetching users for organization:', user.organization?.name);
    
    axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        console.log('📊 Received users:', res.data.length, res.data.map((u: User) => u.name));
        setUsers(res.data);
      })
      .catch(err => {
        console.error("Error fetching users:", err);
        // Fallback: use current user
        setUsers([user]);
      });
  }, [user.organization?.name]);

  useEffect(() => {
    axios.get(`/tasks/assignedTo/${user._id}`)
      .then(res => setTasks(res.data))
      .catch(err => console.error("Error fetching tasks:", err));
  }, [user._id]);

  useEffect(() => {
    if (nav === "assignedtasks") {
      axios.get(`/tasks/assignedBy/${user._id}`)
        .then(res => setAssignedTasks(res.data))
        .catch(err => console.error("Error fetching assigned tasks:", err));
    }
  }, [nav, user._id]);

  useEffect(() => {
    if (nav === "pendingusers" && user.role === 'admin') {
      const token = sessionStorage.getItem("jwt-token");
      axios.get("/auth/admin/pending-users", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setPendingUsers(res.data))
        .catch(err => console.error("Error fetching pending users:", err));
    }
  }, [nav, user.role]);

  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.post("/auth/admin/user-action", {
        userId,
        action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast(`User ${action}d successfully!`, "success");
      // Refresh pending users
      const res = await axios.get("/auth/admin/pending-users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${action} user`, "error");
    }
  };

  const handleDeleteCompany = async (companyCode: string) => {
    if (!window.confirm(`Are you sure you want to delete company '${companyCode}' and ALL its users? This action cannot be undone!`)) {
      return;
    }
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      const res = await axios.delete(`/auth/superadmin/delete-company/${companyCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast(`Company '${companyCode}' deleted successfully! ${res.data.deletedUsers} users removed.`, "success");
      // Refresh companies list
      const companiesRes = await axios.get("/auth/superadmin/companies", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(companiesRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete company", "error");
    }
  };

  useEffect(() => {
    axios.get(`/notifications/${user._id}`)
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Error fetching notifications:", err));
  }, [user._id, showNotifications]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && !(event.target as Element).closest('.sidebar')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateTask({ title, description, assignedTo, dueDate });
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast(errors[0], 'error');
      return;
    }
    
    setValidationErrors([]);
    setLoading(true);
    
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.post("/tasks", { title, description, assignedTo, priority, dueDate, company }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTitle(""); setDescription(""); setAssignedTo(""); setPriority(3); setDueDate(""); setCompany("");
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      setTasks(res.data);
      showToast("Task created successfully! 🎉", "success");
    } catch (err: any) {
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setLoading(false);
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

  const renderStars = (value: number, onClick?: (v: number) => void) => (
    <span>
      {[1, 2, 3, 4, 5].map(star => (
        <FaStar
          key={star}
          color={star <= value ? "#fbbf24" : "#e5e7eb"}
          style={{ cursor: onClick ? "pointer" : "default", marginRight: 2 }}
          onClick={onClick ? () => onClick(star) : undefined}
        />
      ))}
    </span>
  );

  const kanbanColumns = ["Not Started", "Working on it", "Stuck", "Done"];
  const getKanbanTasks = (): KanbanTasksType => {
    const columns: KanbanTasksType = {};
    kanbanColumns.forEach(col => columns[col] = []);
    tasks.forEach(task => {
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

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    
    if (sourceCol !== destCol) {
      const sourceTasksSorted = sortTasks(kanbanTasks[sourceCol], kanbanSort);
      const draggedTask = sourceTasksSorted[result.source.index];
      draggedTask.status = destCol;
      setTasks([...tasks]);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  let content = null;
  if (nav === "profile") {
    content = (
      <ProfileBox style={{
        background: theme === 'dark' ? "#374151" : "#fff",
        boxShadow: "0 4px 24px #c7d2fe44",
        borderRadius: 16,
        maxWidth: 400,
        margin: "0 auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24, flexDirection: "column" }}>
          <div style={{ position: "relative" }}>
            <div
              style={{ cursor: "pointer" }}
              onClick={() => setShowAvatarEditor(true)}
              title="Edit profile photo"
            >
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #2563eb" }} />
                : defaultLogo}
            </div>
            <Button
              type="button"
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 12,
                padding: "2px 10px",
                background: "#2563eb"
              }}
              onClick={() => setShowAvatarEditor(true)}
            >Edit</Button>
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 10, color: theme === 'dark' ? '#ffffff' : '#000000' }}>{user.name}</div>
          <div style={{ color: "#64748b" }}>{user.email}</div>
        </div>
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
                <Button style={{ background: "#b5179e" }} onClick={() => setShowAvatarEditor(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </ProfileBox>
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
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="kanbanSort" style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : '#000000' }}>Sort by:</label>
          <select
            id="kanbanSort"
            value={kanbanSort}
            onChange={e => setKanbanSort(e.target.value as "none" | "priority" | "date")}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #dbeafe" }}
          >
            <option value="none">None</option>
            <option value="priority">Priority</option>
            <option value="date">Due Date</option>
          </select>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container" style={{ display: "flex", gap: 24, overflowX: "auto" }}>
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
                        minWidth: 260,
                        background: theme === 'dark' ? "#374151" : "#f9fafb",
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: "0 2px 12px #c7d2fe22",
                        minHeight: 200
                      }}
                    >
                      <div style={{ fontWeight: 700, color: statusColors[col], marginBottom: 12, fontSize: 18 }}>
                        {col}
                      </div>
                      {tasksToRender.length === 0 && (
                        <div style={{ color: "#64748b", fontSize: 14 }}>No tasks</div>
                      )}
                      {tasksToRender.map((task, idx) => (
                        <Draggable draggableId={task._id} index={idx} key={task._id}>
                          {(provided: DraggableProvided, snapshot) => (
                            <TaskCard
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#fff",
                                border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
                                borderRadius: 10,
                                marginBottom: 12,
                                boxShadow: "0 1px 4px #c7d2fe22",
                                position: "relative",
                                cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                userSelect: 'none',
                                ...provided.draggableProps.style
                              }}
                            >
                              <TaskTitle style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#22223b' }}>
                                {task.title}
                                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
                              </TaskTitle>
                              <TaskDesc style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</TaskDesc>
                              {task.company && (
                                <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                                  <b>Company:</b> {task.company}
                                </div>
                              )}
                              {task.assignedBy && (
                                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>
                                  <b>Assigned By:</b>{" "}
                                  {typeof task.assignedBy === "object" && task.assignedBy !== null
                                    ? (task.assignedBy as User).name
                                    : users.find(u => u._id === task.assignedBy)?.name || "Unknown"}
                                </div>
                              )}
                              {task.dueDate && (
                                <div style={{ color: "#2563eb", fontSize: 13, marginBottom: 4 }}>
                                  <FaCalendar style={{ marginRight: 4 }} />
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              {isOverdue(task) && (
                                <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>
                                  Overdue!
                                </div>
                              )}
                              <Status $status={task.status} style={{
                                fontWeight: 600,
                                background: statusColors[task.status] + "22",
                                color: statusColors[task.status],
                                borderRadius: 8,
                                padding: "2px 10px",
                                display: "inline-block",
                                marginBottom: 8
                              }}>
                                {task.status}
                              </Status>
                            </TaskCard>
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
  } else if (nav === "assigntasks") {
    content = (
      <Form
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
        <div style={{ fontWeight: 700, fontSize: 22, color: "#2563eb", marginBottom: 8 }}>📝 Create New Task</div>
        
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
        
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Task Title</Label>
        <Input
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
          placeholder="Task Title"
          required
        />
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Company</Label>
        <Input
          type="text"
          value={company}
          onChange={(e: any) => setCompany(e.target.value)}
          placeholder="Company Name"
        />
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Description</Label>
        <Input
          value={description}
          onChange={(e: any) => setDescription(e.target.value)}
          placeholder="Description"
          required
        />
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Assign To</Label>
        <select value={assignedTo} onChange={(e: any) => setAssignedTo(e.target.value)} required
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, width: "100%" }}>
          <option value="">Select user...</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Priority</Label>
        <div style={{ marginBottom: 8 }}>{renderStars(priority, setPriority)}</div>
        <Label style={{ color: theme === 'dark' ? '#ffffff' : "#22223b" }}>Due Date</Label>
        <Input type="date" value={dueDate} onChange={(e: any) => setDueDate(e.target.value)} required />
        <Button type="submit" disabled={loading} style={{
          fontWeight: 600, fontSize: "1.1rem", background: loading ? "#ccc" : "#2563eb",
          color: "#fff", padding: "12px 24px", borderRadius: 8, border: "none",
          cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8
        }}>
          {loading ? (
            <>
              <LoadingSpinner size="small" color="white" />
              Creating...
            </>
          ) : (
            "Create Task"
          )}
        </Button>
      </Form>
    );
  } else if (nav === "assignedtasks") {
    // Kanban columns for assigned tasks
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
          <FaUser style={{ marginRight: 8 }} /> Tasks You Assigned
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
                {col}
              </div>
              {assignedKanbanTasks[col].length === 0 && (
                <div style={{ color: "#64748b", fontSize: 14 }}>No tasks</div>
              )}
              {assignedKanbanTasks[col].map(task => (
                <TaskCard key={task._id} style={{
                  background: theme === 'dark' ? "#6b7280" : "#fff",
                  border: "1.5px solid #dbeafe",
                  borderRadius: 10,
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
                        setTitle(task.title);
                        setDescription(task.description);
                        setCompany(task.company || "");
                        setAssignedTo(typeof task.assignedTo === "object" ? (task.assignedTo as User)._id : task.assignedTo);
                        setPriority(task.priority);
                        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
                        setNav('assigntasks');
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
                        setTitle(task.title + " (Copy)");
                        setDescription(task.description);
                        setCompany(task.company || "");
                        setAssignedTo(typeof task.assignedTo === "object" ? (task.assignedTo as User)._id : task.assignedTo);
                        setPriority(task.priority);
                        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
                        setNav('assigntasks');
                        showToast("Task copied for creation!", "success");
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

                  <TaskTitle style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#000000', paddingRight: 80 }}>
                    {task.title}
                    <span style={{ float: "right", marginRight: 80 }}>{renderStars(task.priority)}</span>
                  </TaskTitle>
                  <TaskDesc style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</TaskDesc>
                  {task.company && (
                    <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 3 }}>
                      <b>Company:</b> {task.company}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : "#555", marginBottom: 8 }}>
                    <b>Assigned To:</b> {
                      (() => {
                        console.log('DEBUG task.assignedTo:', task.assignedTo, typeof task.assignedTo);
                        console.log('DEBUG users array:', users);
                        if (typeof task.assignedTo === "object" && task.assignedTo !== null) {
                          return (task.assignedTo as User).name || 'No name property';
                        } else {
                          const foundUser = users.find(u => u._id === task.assignedTo);
                          console.log('DEBUG found user:', foundUser);
                          return foundUser?.name || `User ID: ${task.assignedTo}`;
                        }
                      })()
                    }
                  </div>
                  {task.dueDate && (
                    <div style={{ color: "#2563eb", fontSize: 13, marginBottom: 4 }}>
                      <FaCalendar style={{ marginRight: 4 }} />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  <Status $status={task.status} style={{
                    fontWeight: 600,
                    background: statusColors[task.status] + "22",
                    color: statusColors[task.status],
                    borderRadius: 8,
                    padding: "2px 10px",
                    display: "inline-block",
                    marginBottom: 8
                  }}>
                    {task.status}
                  </Status>
                  {task.completionRemark && (
                    <div style={{ fontSize: 13, color: theme === 'dark' ? '#d1d5db' : "#666", marginTop: 8 }}>
                      <b>Remark:</b> {task.completionRemark}
                    </div>
                  )}
                </TaskCard>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (nav === "pendingusers" && user.role === 'admin') {
    content = (
      <div style={{
        background: theme === 'dark' ? "#374151" : "#fff",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 12px #c7d2fe22",
        maxWidth: 800,
        margin: "0 auto"
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 20,
          marginBottom: 18,
          color: theme === 'dark' ? '#ffffff' : '#000000',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <FaClock /> Pending User Approvals ({pendingUsers.length})
        </div>
        
        {pendingUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#64748b',
            padding: '40px 20px',
            fontSize: 16
          }}>
            No pending user approvals
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingUsers.map(user => (
              <div key={user.id} style={{
                background: theme === 'dark' ? "#4b5563" : "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: theme === 'dark' ? '#ffffff' : '#1f2937',
                    margin: '0 0 8px 0'
                  }}>
                    {user.name}
                  </h3>
                  <p style={{
                    fontSize: 14,
                    color: '#6b7280',
                    margin: '0 0 4px 0'
                  }}>
                    {user.email} • {user.user_id}
                  </p>
                  <p style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    margin: 0
                  }}>
                    Requested: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => handleUserAction(user.id, 'approve')}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    <FaCheck size={12} /> Approve
                  </button>
                  <button
                    onClick={() => handleUserAction(user.id, 'reject')}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    <FaTimes size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (nav === "calendar") {
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
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).length === 0 && (
            <div style={{ color: "#64748b" }}>No tasks for this day.</div>
          )}
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).map(task => (
            <TaskCard key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : theme === 'dark' ? "#4b5563" : "#f9fafb",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              marginBottom: 12,
              boxShadow: "0 1px 4px #c7d2fe22",
              position: "relative"
            }}>
              <TaskTitle style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {task.title}
                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
              </TaskTitle>
              <TaskDesc style={{ color: theme === 'dark' ? '#e5e7eb' : '#475569', marginBottom: 8 }}>{task.description}</TaskDesc>
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
              <Status $status={task.status} style={{
                fontWeight: 600,
                background: statusColors[task.status] + "22",
                color: statusColors[task.status],
                borderRadius: 8,
                padding: "2px 10px",
                display: "inline-block",
                marginBottom: 8
              }}>
                {task.status}
              </Status>
            </TaskCard>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout className="layout-container" style={{ background: theme === 'dark' ? "#1f2937" : "#f1f5f9", minHeight: "100vh" }}>
      {/* Mobile overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <Sidebar className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{
        background: theme === 'dark' ? "#374151" : "#fff",
        borderRight: "1.5px solid #e5e7eb",
        minWidth: 230,
        color: theme === 'dark' ? '#ffffff' : "#22223b"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 16px 0" }}>
          <div style={{ position: "relative" }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: 60, height: 60, borderRadius: "50%", border: "2.5px solid #2563eb" }} />
              : defaultLogo}
            <Button
              type="button"
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 11,
                padding: "1.5px 8px",
                background: "#2563eb"
              }}
              onClick={() => setShowAvatarEditor(true)}
            >Edit</Button>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: theme === 'dark' ? '#ffffff' : "#22223b" }}>{user.name}</div>
          <div style={{ color: "#64748b", fontSize: 14 }}>{user.email}</div>
        </div>
        
        <NavItem $active={nav === "profile"} onClick={() => setNav("profile")} style={{ color: nav === "profile" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaUser /> Profile
        </NavItem>
        <NavItem $active={nav === "kanban"} onClick={() => setNav("kanban")} style={{ color: nav === "kanban" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaColumns /> Tasks Board
        </NavItem>
        <NavItem $active={nav === "assigntasks"} onClick={() => setNav("assigntasks")} style={{ color: nav === "assigntasks" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaPlus /> Assign Tasks
        </NavItem>
        <NavItem $active={nav === "list"} onClick={() => setNav("list")} style={{ color: nav === "list" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaTasks /> Task List
        </NavItem>
        <NavItem $active={nav === "assignedtasks"} onClick={() => setNav("assignedtasks")} style={{ color: nav === "assignedtasks" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaUser /> Tasks Assigned
        </NavItem>
        <NavItem $active={nav === "calendar"} onClick={() => setNav("calendar")} style={{ color: nav === "calendar" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaCalendarAlt /> Calendar
        </NavItem>
        <NavItem $active={nav === "analytics"} onClick={() => setNav("analytics")} style={{ color: nav === "analytics" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
          <FaChartBar /> Analytics
        </NavItem>
        {user.role === 'admin' && (
          <NavItem $active={nav === "pendingusers"} onClick={() => setNav("pendingusers")} style={{ color: nav === "pendingusers" ? "#2563eb" : theme === 'dark' ? '#ffffff' : "#22223b" }}>
            <FaClock /> Pending Users
          </NavItem>
        )}
        <NavItem onClick={onLogout} style={{ color: "#b5179e" }}>
          <FaSignOutAlt /> Logout
        </NavItem>
      </Sidebar>
      
      <Main className="main-content">
        <TopBar className="top-bar" style={{
          background: theme === 'dark' ? "#374151" : "#fff",
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: "0 2px 12px #c7d2fe22",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: "none",
                background: theme === 'dark' ? "#4b5563" : "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: 8,
                cursor: "pointer",
                color: theme === 'dark' ? '#ffffff' : "#6b7280"
              }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            <DashboardTitle className="dashboard-title" style={{ color: theme === 'dark' ? '#ffffff' : "#2563eb", fontWeight: 800, letterSpacing: 1, fontSize: 26 }}>
              {user.organization?.name} Task Management System
            </DashboardTitle>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={toggleTheme}
              style={{
                background: theme === 'dark' ? "#4b5563" : "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "50%",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                color: theme === 'dark' ? '#ffffff' : "#6b7280"
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <FaMoon size={16} /> : <FaSun size={16} />}
            </button>
            <div style={{ position: "relative" }}>
              <button
                style={{
                  background: theme === 'dark' ? "#4b5563" : "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  color: theme === 'dark' ? '#ffffff' : "#6b7280"
                }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FaBell size={18} />
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
        </TopBar>
        
        <div style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          background: "#1f2937",
          color: "white",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: "11px",
          opacity: 0.7,
          zIndex: 1000
        }}>
          Press Ctrl+N for new task, Ctrl+K for kanban, Ctrl+D for dark mode
        </div>
        
        {content}
        
        <FloatingActionButton onAction={handleFABAction} />
        <ToastContainer />
      </Main>
    </Layout>
  );
};

export default Dashboard;