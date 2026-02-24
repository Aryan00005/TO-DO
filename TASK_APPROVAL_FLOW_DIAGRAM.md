# Task Approval Flow - Visual Diagram

## 🔄 Flow 1: Admin Task Assignment & Approval

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ASSIGNS TASK TO ADMIN                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Task Created   │
                    │  Status: Pending│
                    │  approval_status│
                    │  = 'pending'    │
                    └─────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  ADMIN RECEIVES NOTIFICATION            │
        │  "Task approval required: \"Task Title\" │
        │   assigned by User Name"                │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │ ADMIN CLICKS │          │ ADMIN CLICKS │
        │   APPROVE    │          │   REJECT     │
        └──────────────┘          └──────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ Task Updated:        │    │ Task Deleted         │
    │ - status: "Not       │    │ Creator gets         │
    │   Started"           │    │ notification:        │
    │ - approval_status:   │    │ "Task rejected:      │
    │   'approved'         │    │  [reason]"           │
    │ - Appears in Task    │    └──────────────────────┘
    │   Board              │
    └──────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │ Creator & Assignees  │
    │ get notification:    │
    │ "Task approved by    │
    │  admin"              │
    └──────────────────────┘
```

---

## 🔄 Flow 2: Task Completion Approval

```
┌─────────────────────────────────────────────────────────────────┐
│                  ASSIGNEE COMPLETES TASK                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Task Updated   │
                    │  Status: "Done" │
                    │  approval_status│
                    │  = null         │
                    └─────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  CREATOR SEES IN "TASKS ASSIGNED" PANEL │
        │  ┌─────────────────────────────────┐    │
        │  │ Task Title                      │    │
        │  │ Status: Done                    │    │
        │  │ [✅ Approve] [❌ Reject]        │    │
        │  └─────────────────────────────────┘    │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │ CREATOR      │          │ CREATOR      │
        │ CLICKS       │          │ CLICKS       │
        │ APPROVE      │          │ REJECT       │
        └──────────────┘          └──────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ Task Updated:        │    │ Task Updated:        │
    │ - approval_status:   │    │ - status: "Working   │
    │   'approved'         │    │   on it"             │
    │ - approved_at:       │    │ - approval_status:   │
    │   [timestamp] ✅     │    │   'rejected'         │
    │ - Buttons HIDDEN     │    │ - rejection_reason:  │
    │ - Stays in "Done"    │    │   [reason text]      │
    │ - Shows checkmark ✓  │    └──────────────────────┘
    └──────────────────────┘                │
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ Assignee gets        │    │ Assignee gets        │
    │ notification:        │    │ notification:        │
    │ "Task approved by    │    │ "Task rejected:      │
    │  creator"            │    │  [reason]"           │
    └──────────────────────┘    └──────────────────────┘
```

---

## 🎯 Key Points

### **Issue 1 Fix:**
✅ Admin gets special notification: `"Task approval required"`
✅ On approve → Task goes to "Not Started" in Task Board
✅ On reject → Creator gets notification with reason

### **Issue 2 Fix:**
✅ When creator approves → `approved_at` timestamp is set
✅ Frontend checks `approved_at` field → Hides buttons
✅ Task stays in "Done" with checkmark (✓)
✅ Buttons never reappear after approval

---

## 🔍 Frontend Logic

```typescript
// In "Completed Tasks" view
const isApproved = (task as any).approvalStatus === 'approved' || 
                  (task as any).approval_status === 'approved' || 
                  !!(task as any).approved_at; // ← NEW CHECK

const showButtons = isCreator && !isApproved;

{showButtons && (
  <div>
    <button onClick={() => handleApproveTask(task._id)}>
      ✅ Approve
    </button>
    <button onClick={() => handleRejectTask(task._id, reason)}>
      ❌ Reject
    </button>
  </div>
)}
```

---

## 🗄️ Database Fields

```javascript
tasks table:
├── id (primary key)
├── title
├── description
├── status ('Not Started' | 'Working on it' | 'Stuck' | 'Done')
├── approval_status ('pending' | 'approved' | 'rejected' | null)
├── approved_at (timestamp) ← NEW FIELD (auto-added on approval)
├── rejection_reason (text)
├── assigned_by (user_id)
├── company
├── created_at
└── updated_at
```

---

**Created:** February 19, 2025
**Status:** ✅ Implementation Complete
