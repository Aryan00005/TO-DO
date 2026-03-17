# 🎓 COMPLETE VIVA PREPARATION GUIDE

## 📌 THE 3 MOST CRITICAL QUESTIONS

---

## ⭐ QUESTION 1: Explain Your Project Architecture

### **ANSWER:**

Our system uses a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT TIER (Frontend)                    │
│              React + TypeScript + Vite                       │
│              Hosted on: Netlify                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (HTTPS)
                       │ JWT Authentication
┌──────────────────────▼──────────────────────────────────────┐
│                   SERVER TIER (Backend)                      │
│              Node.js + Express.js                            │
│              Hosted on: Render                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL Queries
                       │ Supabase Client
┌──────────────────────▼──────────────────────────────────────┐
│                   DATABASE TIER                              │
│              PostgreSQL (Supabase)                           │
│              Hosted on: Supabase Cloud                       │
└─────────────────────────────────────────────────────────────┘
```

### **Components:**

1. **Frontend (React + TypeScript)**
   - User interface with Kanban board
   - Drag-and-drop task management
   - Real-time notifications
   - Responsive design
   - **Code:** `src/pages/dashboard.tsx`, `src/App.tsx`

2. **Backend (Node.js + Express)**
   - REST API endpoints
   - JWT authentication
   - Business logic
   - Data validation
   - **Code:** `todo-multiuser-backend/server.js`, `routes/task.js`, `routes/auth.js`

3. **Database (PostgreSQL)**
   - User data storage
   - Task management
   - Multi-tenant isolation
   - **Code:** `todo-multiuser-backend/config/database.js`

### **Why React + Node.js?**

1. **JavaScript Everywhere** - Same language for frontend and backend
2. **Fast Development** - Large ecosystem of libraries
3. **Real-time Updates** - Easy to implement with React state
4. **Scalability** - Node.js handles concurrent requests efficiently
5. **Community Support** - Huge developer community

### **Code Locations:**

| Component | File Path |
|-----------|-----------|
| Frontend Entry | `src/main.tsx` |
| Backend Server | `todo-multiuser-backend/server.js` |
| Database Config | `todo-multiuser-backend/config/database.js` |
| API Routes | `todo-multiuser-backend/routes/` |
| React Components | `src/pages/`, `src/components/` |

---

## ⭐ QUESTION 2: Explain Your Database Design

### **ANSWER:**

Our database has **4 main tables** with relationships:

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS TABLE                          │
│  - id (PK)                                                   │
│  - name                                                      │
│  - email                                                     │
│  - password (hashed)                                         │
│  - role (admin/user)                                         │
│  - company                                                   │
│  - is_super_admin                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1:N (One user creates many tasks)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                         TASKS TABLE                          │
│  - id (PK)                                                   │
│  - title                                                     │
│  - description                                               │
│  - status                                                    │
│  - approval_status                                           │
│  - assigned_by (FK → users.id)                              │
│  - priority                                                  │
│  - due_date                                                  │
│  - company                                                   │
│  - created_at                                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ N:M (Many tasks to many users)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   TASK_ASSIGNMENTS TABLE                     │
│  - task_id (FK → tasks.id)                                  │
│  - user_id (FK → users.id)                                  │
│  - PRIMARY KEY (task_id, user_id)                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NOTIFICATIONS TABLE                       │
│  - id (PK)                                                   │
│  - user_id (FK → users.id)                                  │
│  - message                                                   │
│  - is_read                                                   │
│  - created_at                                                │
└─────────────────────────────────────────────────────────────┘
```

### **Table Relationships:**

1. **users → tasks** (1:N)
   - One user can create many tasks
   - Foreign Key: `tasks.assigned_by → users.id`

2. **tasks ↔ users** (N:M via task_assignments)
   - One task can be assigned to multiple users
   - One user can have multiple tasks
   - Junction table: `task_assignments`

3. **users → notifications** (1:N)
   - One user can have many notifications
   - Foreign Key: `notifications.user_id → users.id`

### **Why Task Assignment Table?**

We use a **junction table** (task_assignments) because:
- One task can be assigned to multiple users
- One user can have multiple tasks
- This is a **many-to-many relationship**
- Direct foreign key won't work for N:M relationships

### **Key Concepts:**

**Primary Key (PK):**
- Unique identifier for each row
- Example: `users.id`, `tasks.id`

**Foreign Key (FK):**
- Links two tables together
- Example: `tasks.assigned_by` references `users.id`

**Normalization:**
- Organizing data to reduce redundancy
- We use 3NF (Third Normal Form)
- No duplicate data across tables

### **Code Locations:**

| Component | File Path |
|-----------|-----------|
| Database Schema | `todo-multiuser-backend/supabase-schema.sql` |
| User Model | `todo-multiuser-backend/models/user.js` |
| Task Model | `todo-multiuser-backend/models/task.js` |
| Notification Model | `todo-multiuser-backend/models/notification.js` |

### **Sample Query:**

```sql
-- Fetch tasks assigned to a user
SELECT t.*, u.name as creator_name
FROM tasks t
JOIN task_assignments ta ON t.id = ta.task_id
JOIN users u ON t.assigned_by = u.id
WHERE ta.user_id = 123
AND t.approval_status = 'approved';
```

**Code:** `todo-multiuser-backend/models/task.js` (Line 162-220)

---

## ⭐ QUESTION 3: Explain the Task Workflow Logic

### **ANSWER:**

The task workflow has **5 stages**:

```
STAGE 1: TASK CREATION
   ↓
   User creates task → System checks assignee role
   ↓
   ├─→ Admin assigned? → Status: "Pending Approval"
   └─→ Regular user? → Status: "Not Started"

STAGE 2: ADMIN APPROVAL (if needed)
   ↓
   Admin reviews task
   ↓
   ├─→ APPROVE → Status: "Not Started"
   └─→ REJECT → Task deleted

STAGE 3: WORK PROGRESS
   ↓
   User updates status via Kanban drag-and-drop
   ↓
   Not Started → Working on it → Stuck → Done

STAGE 4: COMPLETION
   ↓
   User marks as "Done"
   ↓
   approval_status = "pending"

STAGE 5: FINAL APPROVAL
   ↓
   Task creator reviews completion
   ↓
   ├─→ APPROVE → approval_status = "approved" ✅
   └─→ REJECT → Status back to "Working on it" ❌
```

### **Detailed Flow:**

**1. Task Creation**
- **File:** `todo-multiuser-backend/models/task.js` (Line 8-160)
- **Logic:** Check if admin is assigned → Set approval_status

```javascript
// Check if assignee is admin
if (user?.role === 'admin') {
  hasAdminAssignee = true;
}

// Set approval status
if (hasAdminAssignee) {
  approvalStatus = 'pending';
}
```

**2. Admin Approval**
- **File:** `todo-multiuser-backend/routes/task.js` (Line 550-620)
- **Endpoint:** `POST /tasks/:taskId/approve`

```javascript
router.post('/:taskId/approve', auth, async (req, res) => {
  // Only admin can approve
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Update to approved
  await supabase
    .from('tasks')
    .update({ 
      approval_status: 'approved',
      status: 'Not Started'
    })
    .eq('id', req.params.taskId);
});
```

**3. Work Progress**
- **File:** `src/pages/dashboard.tsx` (Line 350-370)
- **UI:** Kanban board with drag-and-drop

```typescript
const onDragEnd = (result: DropResult) => {
  const destCol = result.destination.droppableId;
  draggedTask.status = destCol; // Update status
  setTasks([...tasks]); // Re-render
};
```

**4. Completion**
- **File:** `todo-multiuser-backend/routes/task.js` (Line 280-285)

```javascript
// When moving to Done
if (status === 'Done') {
  updateData.approval_status = 'pending';
}
```

**5. Final Approval**
- **File:** `todo-multiuser-backend/routes/task.js` (Line 220-250)

```javascript
// Only creator can approve completion
if (task.assigned_by !== currentUser.id) {
  return res.status(403).json({ message: 'Only creator can approve' });
}

if (approval_status === 'approved') {
  updateData.approval_status = 'approved';
}
```

### **Code Locations:**

| Feature | File | Lines |
|---------|------|-------|
| Task Creation | `models/task.js` | 8-160 |
| Status Updates | `routes/task.js` | 200-350 |
| Admin Approval | `routes/task.js` | 550-620 |
| Kanban Board | `dashboard.tsx` | 350-500 |
| Drag-and-Drop | `dashboard.tsx` | 350-370 |

---

## 📋 ALL OTHER QUESTIONS - QUICK ANSWERS

### 1️⃣ Basic Project Questions

**Q: What problem does your system solve?**
A: Manages tasks across multiple companies with role-based access, approval workflows, and real-time tracking.

**Q: Who are the target users?**
A: Super Admins, Company Admins, and Company Users in organizations needing task management.

**Q: Main features?**
A: Multi-tenancy, Kanban board, task approval, notifications, user management, analytics.

**Q: Different from Jira/Trello?**
A: Lightweight, multi-tenant, built for small-medium companies, simpler UI, approval workflow.

**Q: Limitations?**
A: No file attachments, no real-time collaboration, basic reporting, no mobile app.

**Q: Future improvements?**
A: File uploads, real-time updates (WebSocket), email notifications, mobile app, advanced analytics.

---

### 3️⃣ Multi-Tenant Architecture

**Q: What is multi-tenant architecture?**
A: Single application instance serves multiple companies (tenants) with isolated data.

**Q: How do you ensure data isolation?**
A: Every query filters by `company` field. Users only see their company's data.

**Code:** `todo-multiuser-backend/routes/auth.js` (Line 150-180)
```javascript
// Filter users by company
const { data: users } = await supabase
  .from('users')
  .select('*')
  .eq('company', currentUser.company);
```

**Q: What field ensures company separation?**
A: `company` field in users and tasks tables.

**Q: Can it support 100 companies?**
A: Yes! Each company is isolated by `company` field. Database can handle millions of records.

---

### 4️⃣ Database Questions

**Q: Why PostgreSQL/Supabase?**
A: ACID compliance, relational data, complex queries, free tier, built-in auth.

**Q: Main tables?**
A: users, tasks, task_assignments, notifications

**Q: SQL vs NoSQL?**
A: SQL = Structured, relational, ACID. NoSQL = Flexible schema, document-based, eventual consistency.

---

### 5️⃣ Backend Questions

**Q: Why Node.js?**
A: Non-blocking I/O, JavaScript everywhere, large ecosystem, fast development.

**Q: What is Express.js?**
A: Web framework for Node.js. Handles routing, middleware, HTTP requests.

**Q: What is middleware?**
A: Functions that execute before route handlers. Example: authentication check.

**Code:** `todo-multiuser-backend/middleware/auth.js`
```javascript
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'No token' });
  // Verify token
  next(); // Continue to route handler
};
```

**Q: HTTP Methods?**
- GET = Fetch data
- POST = Create new data
- PUT = Update entire resource
- PATCH = Update partial resource
- DELETE = Remove data

---

### 6️⃣ Authentication & Security

**Q: What is JWT?**
A: JSON Web Token. Encrypted token containing user info. Sent with each request.

**Q: Why JWT over sessions?**
A: Stateless, scalable, works across multiple servers, no server-side storage.

**Q: What's in JWT token?**
A: User ID, role, company, expiration time.

**Code:** `todo-multiuser-backend/routes/auth.js` (Line 80-100)
```javascript
const token = jwt.sign(
  { id: user.id, role: user.role, company: user.company },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

**Q: What is bcrypt?**
A: Password hashing library. One-way encryption. Can't reverse to original password.

**Q: What is CORS?**
A: Cross-Origin Resource Sharing. Allows frontend (Netlify) to call backend (Render).

---

### 7️⃣ RBAC Questions

**Q: What is RBAC?**
A: Role-Based Access Control. Permissions based on user role.

**Q: Roles in system?**
A: Super Admin, Company Admin, Company User

**Q: Super Admin can?**
A: Create companies, create company admins, view all companies.

**Q: Company Admin can?**
A: Approve tasks, manage users, view company analytics.

**Q: User can?**
A: Create tasks, update task status, view assigned tasks.

**Code:** `todo-multiuser-backend/middleware/auth.js`
```javascript
if (currentUser.role !== 'admin') {
  return res.status(403).json({ message: 'Admin only' });
}
```

---

### 9️⃣ Frontend Questions

**Q: Why React?**
A: Component-based, virtual DOM, large ecosystem, easy state management.

**Q: What is useState?**
A: React hook to manage component state.

```typescript
const [tasks, setTasks] = useState<Task[]>([]);
```

**Q: What is useEffect?**
A: React hook for side effects (API calls, subscriptions).

```typescript
useEffect(() => {
  fetchTasks(); // Runs on component mount
}, []);
```

**Q: Why TypeScript?**
A: Type safety, better IDE support, catches errors at compile time, better for large projects.

---

### 🔟 Deployment Questions

**Q: Where hosted?**
- Frontend: Netlify
- Backend: Render
- Database: Supabase

**Q: What is CI/CD?**
A: Continuous Integration/Deployment. Auto-deploy on git push.

**Q: Environment variables?**
A: Store secrets (API keys, database URLs) outside code.

**File:** `.env`
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
JWT_SECRET=xxx
```

---

## 🎯 QUICK REFERENCE CARD

### **Architecture:**
3-tier: React (Frontend) → Express (Backend) → PostgreSQL (Database)

### **Database Tables:**
users, tasks, task_assignments, notifications

### **Task Workflow:**
Create → Admin Approve → Work → Done → Creator Approve

### **Key Files:**
- Backend: `server.js`, `routes/task.js`, `models/task.js`
- Frontend: `dashboard.tsx`, `App.tsx`
- Database: `supabase-schema.sql`

### **Authentication:**
JWT tokens, bcrypt password hashing, middleware protection

### **Multi-Tenancy:**
Filter by `company` field in all queries

---

## ✅ PRACTICE TIPS

1. Draw architecture diagram on whiteboard
2. Explain workflow with hand gestures
3. Mention specific file names and line numbers
4. Show understanding of WHY, not just WHAT
5. Be confident - you built this!

**Good luck! 🚀**
