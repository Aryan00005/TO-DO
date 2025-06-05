import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
  type DroppableStateSnapshot,
  type DropResult
} from "@hello-pangea/dnd";
import React, { useEffect, useState } from "react";
import AvatarEdit from "react-avatar-edit";
import { FaBell, FaCalendar, FaCalendarAlt, FaChartBar, FaColumns, FaPlus, FaSignOutAlt, FaStar, FaTasks, FaUser } from "react-icons/fa";
import axios from "../api/axios";
import {
  Button,
  DashboardTitle,
  Form, Input,
  Label,
  Layout,
  Main,
  NavItem,
  ProfileBox,
  Select,
  Sidebar,
  Status, TaskActions,
  TaskCard,
  TaskDesc,
  TaskTitle,
  TopBar
} from "../components/StyledComponents";

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  assignedTo: string | User;
  assignedBy?: string | User;
  priority: number;
  dueDate?: string;
  completionRemark?: string;
  company?: string;
}

interface Notification {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardProps {
  user: User | null
  onLogout: () => void;
}

// Helper: status colors
const statusColors: Record<string, string> = {
  "Not Started": "#64748b",
  "Working on it": "#fbbf24",
  "Stuck": "#ef4444",
  "Done": "#22c55e",
};

// Default logo SVG (replace with your own if you want)
const defaultLogo = (
  <svg width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill="#2563eb" />
    <text x="50%" y="54%" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" dy=".3em">T</text>
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
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
  const [remarkInput, setRemarkInput] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  // Avatar
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || "");
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  // --- Calendar Dates ---
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // For calendar: initialize selectedDate as today's date string (day number)
  const [selectedDate, setSelectedDate] = useState<string>(today.getDate().toString());

  // --- Filter/Sort State ---
  const [kanbanSort, setKanbanSort] = useState<"none" | "priority" | "date">("none");
  const [assignedSort, setAssignedSort] = useState<"none" | "priority" | "date">("none");

  // --- Edit Task State ---
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editPriority, setEditPriority] = useState(3);
  const [editDueDate, setEditDueDate] = useState("");

  // Prevent rendering until user is loaded
  if (!user || !user._id) {
    return <div>Loading user...</div>;
  }

  // Fetch users for assignment dropdown
  useEffect(() => {
    axios.get("/auth/users")
      .then(res => setUsers(res.data))
      .catch(err => console.error("Error fetching users:", err));
  }, []);

  // Fetch all tasks for analytics/kanban/calendar
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

  // Fetch notifications for this user
  useEffect(() => {
    axios.get(`/notifications/${user._id}`)
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Error fetching notifications:", err));
  }, [user._id, showNotifications]);

  // Create a new task
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.post(
        "/tasks",
        {
          title,
          description,
          assignedTo,
          priority,
          dueDate,
          company,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setPriority(3);
      setDueDate("");
      setCompany("");
      // Refresh tasks
      const [assignedToRes, assignedByRes] = await Promise.all([
        axios.get(`/tasks/assignedTo/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/tasks/assignedBy/${user._id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const allTasks = [...assignedToRes.data, ...assignedByRes.data];
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t._id, t])).values());
      setTasks(uniqueTasks);
      alert("Task assigned!");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        // @ts-ignore
        alert(err.response?.data?.message || "An error occurred");
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("An unknown error occurred");
      }
    }
  };

  // Update task status with remark
  const handleStatus = async (taskId: string, status: string, remark: string) => {
    try {
      await axios.patch(`/tasks/${taskId}/status`, { status, remark });
      setCompletingTaskId(null);
      setRemarkInput("");
      const res = await axios.get(`/tasks/assignedTo/${user._id}`);
      setTasks(res.data);
    } catch (err) {
      alert("Error updating status");
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      await axios.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications =>
        notifications.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) { }
  };

  // Logout handler
  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  // priority colors for star
  const priorityColors = [
    "#22c55e", // 1 - green
    "#a3e635", // 2 - lime
    "#fde047", // 3 - yellow
    "#fbbf24", // 4 - orange
    "#ef4444"  // 5 - red
  ];

  const renderStars = (value: number, onClick?: (v: number) => void) => (
    <span>
      {[1, 2, 3, 4, 5].map(star => (
        <FaStar
          key={star}
          color={star <= value ? priorityColors[value - 1] : "#e5e7eb"}
          style={{ cursor: onClick ? "pointer" : "default", marginRight: 2, transition: "color 0.2s" }}
          onClick={onClick ? () => onClick(star) : undefined}
        />
      ))}
    </span>
  );

  // --- Analytics ---
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const inProgressTasks = tasks.filter(t => t.status === "Working on it").length;
  const stuckTasks = tasks.filter(t => t.status === "Stuck").length;

  // --- Kanban Columns ---
  const kanbanColumns = ["Not Started", "Working on it", "Stuck", "Done"];
  const kanbanTasks: Record<string, Task[]> = {
    "Not Started": [],
    "Working on it": [],
    "Stuck": [],
    "Done": [],
  };
  tasks.forEach(task => {
    kanbanTasks[task.status] = kanbanTasks[task.status] || [];
    kanbanTasks[task.status].push(task);
  });

  // --- Sorting Helper ---
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

  // --- Drag and Drop for Kanban ---
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    if (sourceCol === destCol && result.source.index === result.destination.index) return;

    const sourceTasks = Array.from(kanbanTasks[sourceCol]);
    const [movedTask] = sourceTasks.splice(result.source.index, 1);

    // Move to new column/status
    movedTask.status = destCol;
    kanbanTasks[sourceCol] = sourceTasks;
    kanbanTasks[destCol] = [...kanbanTasks[destCol], movedTask];

    // Update backend
    await handleStatus(movedTask._id, destCol, movedTask.completionRemark || "");
  };

  // --- Profile Avatar Upload ---
  const handleAvatarSave = (img: string | null) => {
    setAvatar(img);
    setShowAvatarEditor(false);
    // TODO: Optionally upload to backend
    // await axios.post("/auth/avatar", { avatar: img });
  };

  // --- Helper: Overdue ---
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  // Handler for deleting a task (only assignee can see the button)
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.delete(`/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(tasks => tasks.filter(task => task._id !== taskId));
    } catch (err: any) {
      alert("Failed to delete task: " + (err.response?.data?.message || err.message));
    }
  };

  // --- Main Content Tabs ---
  let content = null;
  if (nav === "profile") {
    content = (
      <ProfileBox style={{
        background: "#fff",
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
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 10 }}>{user.name}</div>
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
                onCrop={handleAvatarSave}
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
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 16 }}>Total Tasks</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{totalTasks}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>Completed</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{doneTasks}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 16 }}>In Progress</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{inProgressTasks}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #c7d2fe22", padding: 24 }}>
          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 16 }}>Stuck</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{stuckTasks}</div>
        </div>
      </div>
    );
  } else if (nav === "kanban") {
    content = (
      <div>
        {/* FILTER BUTTONS FOR KANBAN */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Sort by:</span>
          <Button
            type="button"
            style={{ background: kanbanSort === "none" ? "#2563eb" : "#e5e7eb", color: kanbanSort === "none" ? "#fff" : "#222" }}
            onClick={() => setKanbanSort("none")}
          >None</Button>
          <Button
            type="button"
            style={{ background: kanbanSort === "priority" ? "#2563eb" : "#e5e7eb", color: kanbanSort === "priority" ? "#fff" : "#222" }}
            onClick={() => setKanbanSort("priority")}
          >Priority</Button>
          <Button
            type="button"
            style={{ background: kanbanSort === "date" ? "#2563eb" : "#e5e7eb", color: kanbanSort === "date" ? "#fff" : "#222" }}
            onClick={() => setKanbanSort("date")}
          >Due Date</Button>
        </div>
        {/* KANBAN BOARD */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", overflowX: "auto" }}>
            {kanbanColumns.map(col => (
              <Droppable droppableId={col} key={col}>
                {(provided: DroppableProvided, _snapshot: DroppableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minWidth: 260,
                      background: "#f9fafb",
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: "0 2px 12px #c7d2fe22",
                      minHeight: 200
                    }}
                  >
                    <div style={{ fontWeight: 700, color: statusColors[col], marginBottom: 12, fontSize: 18 }}>
                      {col}
                    </div>
                    {kanbanTasks[col].length === 0 && (
                      <div style={{ color: "#64748b", fontSize: 14 }}>No tasks</div>
                    )}
                    {sortTasks(kanbanTasks[col], kanbanSort).map((task, idx) => {
                      const isAssignee = task.assignedTo === user._id;
                      return (
                        <Draggable draggableId={task._id} index={idx} key={task._id}>
                          {(provided: DraggableProvided, _snapshot: DraggableStateSnapshot) => (
                            <TaskCard
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: isOverdue(task) ? "#fff0f0" : "#fff",
                                border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
                                borderRadius: 10,
                                marginBottom: 12,
                                boxShadow: "0 1px 4px #c7d2fe22",
                                position: "relative",
                                ...provided.draggableProps.style
                              }}
                            >
                              <TaskTitle style={{ fontWeight: 600, fontSize: 16, color: "#22223b" }}>
                                {task.title}
                                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
                              </TaskTitle>
                              <TaskDesc style={{ color: "#475569", marginBottom: 8 }}>{task.description}</TaskDesc>
                              {task.company && (
                                <div style={{ fontSize: 14, color: "#555", marginBottom: 3 }}>
                                  <b>Company:</b> {task.company}
                                </div>
                              )}
                              {task.assignedBy && (
                                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>
                                  <b>Assigned By:</b>{" "}
                                  {typeof task.assignedBy === "object" && task.assignedBy !== null
                                    ? task.assignedBy.name
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
                              {isAssignee && (
                                <Button
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    marginTop: 8,
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    border: "none",
                                    cursor: "pointer",
                                    float: "right"
                                  }}
                                  onClick={() => handleDeleteTask(task._id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </TaskCard>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
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
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
          <FaUser style={{ marginRight: 8 }} /> Tasks You Assigned
        </div>
        {/* FILTER BUTTONS FOR ASSIGNED TASKS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Sort by:</span>
          <Button
            type="button"
            style={{ background: assignedSort === "none" ? "#2563eb" : "#e5e7eb", color: assignedSort === "none" ? "#fff" : "#222" }}
            onClick={() => setAssignedSort("none")}
          >None</Button>
          <Button
            type="button"
            style={{ background: assignedSort === "priority" ? "#2563eb" : "#e5e7eb", color: assignedSort === "priority" ? "#fff" : "#222" }}
            onClick={() => setAssignedSort("priority")}
          >Priority</Button>
          <Button
            type="button"
            style={{ background: assignedSort === "date" ? "#2563eb" : "#e5e7eb", color: assignedSort === "date" ? "#fff" : "#222" }}
            onClick={() => setAssignedSort("date")}
          >Due Date</Button>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", overflowX: "auto" }}>
          {assignedKanbanColumns.map(col => (
            <div
              key={col}
              style={{
                minWidth: 260,
                background: "#f9fafb",
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
              {sortTasks(assignedKanbanTasks[col], assignedSort).map(task => (
                <TaskCard key={task._id} style={{
                  background: isOverdue(task) ? "#fff0f0" : "#fff",
                  border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
                  borderRadius: 10,
                  marginBottom: 12,
                  boxShadow: "0 1px 4px #c7d2fe22",
                  position: "relative"
                }}>
                  {/* --- EDIT BUTTON --- */}
                  <Button
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      position: "absolute",
                      top: 8,
                      right: 8,
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 13,
                      zIndex: 2
                    }}
                    onClick={() => {
                      setEditTask(task);
                      setEditTitle(task.title);
                      setEditDescription(task.description);
                      setEditCompany(task.company || "");
                      setEditAssignedTo(typeof task.assignedTo === "object" ? task.assignedTo._id : task.assignedTo);
                      setEditPriority(task.priority);
                      setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <TaskTitle>
                    {task.title}
                    <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
                  </TaskTitle>
                  <TaskDesc>{task.description}</TaskDesc>
                  {task.company && (
                    <div style={{ fontSize: 14, color: "#555", marginBottom: 3 }}>
                      <b>Company:</b> {task.company}
                    </div>
                  )}
                  <div>
                    <b>Assigned To:</b> {
                      typeof task.assignedTo === "object"
                        ? task.assignedTo.name
                        : users.find(u => u._id === task.assignedTo)?.name || "Unknown"
                    }
                  </div>
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
                  {task.completionRemark && (
                    <div>
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
  } else if (nav === "calendar") {
    content = (
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px #c7d2fe22", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
          <FaCalendarAlt style={{ marginRight: 8 }} /> Calendar
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {calendarDates.map(day => (
            <div
              key={day}
              onClick={() => setSelectedDate(day.toString())}
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
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            Tasks for {selectedDate ? `Day ${selectedDate}` : "this month"}:
          </div>
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).length === 0 && (
            <div style={{ color: "#64748b" }}>No tasks for this day.</div>
          )}
          {tasks.filter(t => t.dueDate && new Date(t.dueDate).getDate().toString() === selectedDate).map(task => (
            <TaskCard key={task._id} style={{
              background: isOverdue(task) ? "#fff0f0" : "#f9fafb",
              border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
              borderRadius: 10,
              marginBottom: 12,
              boxShadow: "0 1px 4px #c7d2fe22",
              position: "relative"
            }}>
              <TaskTitle style={{ fontWeight: 600, fontSize: 16 }}>
                {task.title}
                <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
              </TaskTitle>
              <TaskDesc style={{ color: "#475569", marginBottom: 8 }}>{task.description}</TaskDesc>
              {task.company && (
                <div style={{ fontSize: 14, color: "#555", marginBottom: 3 }}>
                  <b>Company:</b> {task.company}
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
          ))}
        </div>
      </div>
    );
  } else if (nav === "assigntasks") {
    content = (
      <Form
        onSubmit={handleCreate}
        style={{
          background: "#fff",
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
        <div style={{ fontWeight: 700, fontSize: 22, color: "#2563eb", marginBottom: 8 }}>Assign New Task</div>
        <Label style={{ color: "#22223b" }}>Task Title</Label>
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Task Title"
          required
        />
        <Label>
          Company:
          <Input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Company Name"
          />
        </Label>
        <Label style={{ color: "#22223b" }}>Description</Label>
        <Input
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder="Description"
          required
        />
        <Label style={{ color: "#22223b" }}>Assign To</Label>
        <Select
          value={assignedTo}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedTo(e.target.value)}
          required
        >
          <option key="default" value="">Select user...</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </Select>
        <Label style={{ color: "#22223b" }}>Priority</Label>
        <div style={{ marginBottom: 8 }}>{renderStars(priority, setPriority)}</div>
        <Label style={{ color: "#22223b" }}>Due Date</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          required
          style={{ maxWidth: 220 }}
        />
        <Button type="submit" style={{ fontWeight: 600, fontSize: "1.1rem", background: "#2563eb" }}>Assign Task</Button>
      </Form>
    );
  } else if (nav === "list") {
    content = (
      <div>
        {tasks.length === 0 && <div>No tasks assigned to you yet.</div>}
        {tasks.map(task => (
          <TaskCard key={task._id} style={{
            background: isOverdue(task) ? "#fff0f0" : "#fff",
            border: isOverdue(task) ? "2px solid #ef4444" : "1.5px solid #dbeafe",
            borderRadius: 10,
            marginBottom: 12,
            boxShadow: "0 1px 4px #c7d2fe22"
          }}>
            <TaskTitle>
              {task.title}
              <span style={{ float: "right" }}>{renderStars(task.priority)}</span>
            </TaskTitle>
            <TaskDesc>{task.description}</TaskDesc>
            {task.company && (
              <div style={{ fontSize: 14, color: "#555", marginBottom: 3 }}>
                <b>Company:</b> {task.company}
              </div>
            )}
            {task.assignedBy && (
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>
                <b>Assignee:</b>{" "}
                {typeof task.assignedTo === "object" && task.assignedTo !== null
                  ? task.assignedTo.name
                  : users.find(u => u._id === task.assignedTo)?.name || "Unknown"}
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
            <Status $status={task.status}>
              Status: {task.status}
            </Status>
            {task.completionRemark && (
              <div>
                <b>Remark:</b> {task.completionRemark}
              </div>
            )}
            <TaskActions>
              {task.status !== "Done" && (
                completingTaskId === task._id ? (
                  <div>
                    <Input
                      value={remarkInput}
                      onChange={e => setRemarkInput(e.target.value)}
                      placeholder="Completion remark (optional)"
                    />
                    <Button
                      style={{ background: "#16a34a" }}
                      onClick={() => handleStatus(task._id, "Done", remarkInput)}
                    >
                      Submit Remark & Complete
                    </Button>
                    <Button
                      style={{ background: "#b5179e", marginLeft: 8 }}
                      onClick={() => { setCompletingTaskId(null); setRemarkInput(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    style={{ background: "#16a34a" }}
                    onClick={() => setCompletingTaskId(task._id)}
                  >
                    Mark Completed
                  </Button>
                )
              )}
            </TaskActions>
          </TaskCard>
        ))}
      </div>
    );
  }

  // --- EDIT MODAL ---
  const editModal = showEditModal && (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "#0008", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 16, minWidth: 320, boxShadow: "0 4px 24px #0004" }}>
        <h3 style={{ marginBottom: 16, color: "#2563eb" }}>Edit Task</h3>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!editTask) return;
          try {
            const token = sessionStorage.getItem("jwt-token");
            await axios.patch(`/tasks/${editTask._id}`, {
              title: editTitle,
              description: editDescription,
              company: editCompany,
              assignedTo: editAssignedTo,
              priority: editPriority,
              dueDate: editDueDate
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh assigned tasks
            const res = await axios.get(`/tasks/assignedBy/${user._id}`);
            setAssignedTasks(res.data);
            setShowEditModal(false);
          } catch (err: any) {
            alert("Failed to update task: " + (err.response?.data?.message || err.message));
          }
        }}>
          <Label>Title</Label>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
          <Label>Description</Label>
          <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} required />
          <Label>Company</Label>
          <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} />
          <Label>Assign To</Label>
          <Select value={editAssignedTo} onChange={e => setEditAssignedTo(e.target.value)} required>
            <option value="">Select user...</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </Select>
          <Label>Priority</Label>
          <div style={{ marginBottom: 8 }}>{renderStars(editPriority, setEditPriority)}</div>
          <Label>Due Date</Label>
          <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <Button type="submit" style={{ background: "#2563eb" }}>Save</Button>
            <Button type="button" style={{ background: "#b5179e" }} onClick={() => setShowEditModal(false)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );

  // Notification bell and dropdown
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout style={{ background: "#f1f5f9", minHeight: "100vh" }}>
      <Sidebar style={{
        background: "#fff",
        borderRight: "1.5px solid #e5e7eb",
        minWidth: 230,
        color: "#22223b"
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
          <div style={{ fontWeight: 700, fontSize: 18, color: "#22223b" }}>{user.name}</div>
          <div style={{ color: "#64748b", fontSize: 14 }}>{user.email}</div>
        </div>
        <NavItem $active={nav === "profile"} onClick={() => setNav("profile")} style={{ color: nav === "profile" ? "#2563eb" : "#22223b" }}>
          <FaUser /> Profile
        </NavItem>

        <NavItem $active={nav === "kanban"} onClick={() => setNav("kanban")} style={{ color: nav === "kanban" ? "#2563eb" : "#22223b" }}>
          <FaColumns /> Tasks Board
        </NavItem>

        <NavItem $active={nav === "assigntasks"} onClick={() => setNav("assigntasks")} style={{ color: nav === "assigntasks" ? "#2563eb" : "#22223b" }}>
          <FaPlus /> Assign Tasks
        </NavItem>

        <NavItem $active={nav === "list"} onClick={() => setNav("list")} style={{ color: nav === "list" ? "#2563eb" : "#22223b" }}>
          <FaTasks /> Task List
        </NavItem>

        <NavItem $active={nav === "assignedtasks"} onClick={() => setNav("assignedtasks")} style={{ color: nav === "assignedtasks" ? "#2563eb" : "#22223b" }}>
          <FaUser /> Tasks Assigned
        </NavItem>

        <NavItem $active={nav === "calendar"} onClick={() => setNav("calendar")} style={{ color: nav === "calendar" ? "#2563eb" : "#22223b" }}>
          <FaCalendarAlt /> Calendar
        </NavItem>

        <NavItem $active={nav === "analytics"} onClick={() => setNav("analytics")} style={{ color: nav === "analytics" ? "#2563eb" : "#22223b" }}>
          <FaChartBar /> Analytics
        </NavItem>

        <NavItem onClick={handleLogoutClick} style={{ color: "#b5179e" }}>
          <FaSignOutAlt /> Logout
        </NavItem>
      </Sidebar>
      <Main>
        <TopBar style={{
          background: "#fff",
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: "0 2px 12px #c7d2fe22",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <DashboardTitle style={{ color: "#2563eb", fontWeight: 800, letterSpacing: 1, fontSize: 26 }}>
            RLA TMS
          </DashboardTitle>
          <div style={{ position: "relative" }}>
            <FaBell
              size={24}
              style={{ cursor: "pointer", color: "#2563eb" }}
              onClick={() => setShowNotifications(!showNotifications)}
            />
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
            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 30,
                  background: "#fff",
                  color: "#22223b",
                  border: "1.5px solid #2563eb44",
                  borderRadius: 12,
                  minWidth: 270,
                  zIndex: 100,
                  maxHeight: 340,
                  overflowY: "auto",
                  boxShadow: "0 4px 24px #2563eb22"
                }}
              >
                <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: "bold", background: "#f1f5fa" }}>
                  Notifications
                </div>
                {notifications.length === 0 && (
                  <div style={{ padding: 12, color: "#64748b" }}>No notifications</div>
                )}
                {notifications.map(n => (
                  <div
                    key={n._id}
                    style={{
                      padding: 12,
                      background: n.isRead ? "#f2e9e4" : "#ffe4fa",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      borderRadius: 8,
                      margin: 6
                    }}
                    onClick={() => markNotificationRead(n._id)}
                  >
                    {n.message}
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TopBar>
        {editModal}
        {content}
      </Main>
    </Layout>
  );
};

export default Dashboard;
