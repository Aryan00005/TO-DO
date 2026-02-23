# Task Completion Approval - Visual Guide

## 🎯 Feature Overview

This feature adds an approval workflow for completed tasks, ensuring quality control before tasks are marked as truly complete.

---

## 📸 Visual Flow

### Step 1: Task Marked as "Done"
```
┌─────────────────────────────────────┐
│  Task: Fix Login Bug                │
│  Status: Done                       │
│  ┌─────────────┐  ┌──────────────┐ │
│  │  ✓ Approve  │  │  ✗ Reject    │ │
│  └─────────────┘  └──────────────┘ │
│  (Only visible to task creator)    │
└─────────────────────────────────────┘
```

### Step 2A: Approved Task
```
┌─────────────────────────────────────┐
│  Task: Fix Login Bug                │
│  Status: Done                       │
│  ┌──────────────┐                   │
│  │ ✓ APPROVED   │  (Green Badge)    │
│  └──────────────┘                   │
│  Background: Dark Green             │
│  Border: Green                      │
│  Auto-delete: After 30 days         │
└─────────────────────────────────────┘
```

### Step 2B: Rejected Task
```
┌─────────────────────────────────────┐
│  Rejection Reason Modal             │
│  ─────────────────────────────────  │
│  Task: Fix Login Bug                │
│                                     │
│  Please provide rejection reason:   │
│  ┌─────────────────────────────┐   │
│  │ The bug still exists on     │   │
│  │ mobile devices. Please fix  │   │
│  │ for all platforms.          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Reject Task]  [Cancel]            │
└─────────────────────────────────────┘

After rejection:

┌─────────────────────────────────────┐
│  Task: Fix Login Bug                │
│  Status: Working on it              │
│  ┌──────────────┐                   │
│  │ ✗ REJECTED   │  (Purple Badge)   │
│  └──────────────┘                   │
│  Background: Yellow-Purple Mix      │
│  Border: Purple                     │
│  Click to view rejection reason     │
└─────────────────────────────────────┘
```

---

## 🎨 Color Reference

### Approved Tasks
- **Background**: `#d1fae5` (Light Green) / `#065f46` (Dark Green in dark mode)
- **Border**: `#10b981` (Green)
- **Badge**: Green with white text "✓ APPROVED"

### Rejected Tasks
- **Background**: `#fef3c7` (Yellow-Purple Mix) / `#78350f` (Dark mode)
- **Border**: `#a855f7` (Purple)
- **Badge**: Purple with white text "✗ REJECTED"

### Pending Approval (Done but not approved)
- **Background**: Default task background
- **Border**: Default task border
- **Buttons**: Green "Approve" + Red "Reject"

---

## 👥 User Roles

### Task Creator (Admin or User)
✅ Can see Approve/Reject buttons on completed tasks
✅ Can approve task completion
✅ Can reject task completion with reason
✅ Can view rejection reason

### Task Assignee
✅ Can mark task as "Done"
✅ Can view rejection reason by clicking task
✅ Can continue working on rejected tasks
❌ Cannot approve/reject tasks

---

## 🔄 Status Transitions

```
Not Started
    ↓
Working on it
    ↓
Done (Pending Approval)
    ↓
    ├─→ [Approve] → Done (Approved) → Auto-delete after 30 days
    │
    └─→ [Reject] → Working on it (Rejected) → Can be completed again
```

---

## 💡 Key Features

1. **Quality Control**: Task creators verify work before marking as complete
2. **Feedback Loop**: Rejection reasons help assignees understand what needs fixing
3. **Visual Indicators**: Color-coded tasks make status immediately clear
4. **Auto-Cleanup**: Approved tasks are automatically deleted after 30 days
5. **Flexible Workflow**: Rejected tasks can be reworked and resubmitted

---

## 🚀 Usage Tips

### For Task Creators
- Review completed tasks promptly to avoid bottlenecks
- Provide clear, actionable rejection reasons
- Use approval to acknowledge good work

### For Task Assignees
- Always check rejection reasons before reworking
- Ensure all requirements are met before marking as "Done"
- Ask for clarification if rejection reason is unclear

---

## 📊 Dashboard Views

### Kanban Board
- Approved tasks show in "Done" column with green badge
- Rejected tasks show in "Working on it" column with purple badge
- Pending approval tasks show in "Done" column with Approve/Reject buttons

### Tasks Assigned View
- Same visual indicators as Kanban board
- Creator can approve/reject from this view too

### Task List View
- All tasks show their completion status with appropriate colors
- Click rejected tasks to view reason

---

## ⚙️ Technical Details

### Database Fields
- `completion_status`: 'pending' | 'approved' | 'rejected'
- `rejection_reason`: TEXT (stores reason for rejection)
- `approved_at`: TIMESTAMP (tracks when task was approved)

### API Endpoints
- `POST /tasks/:taskId/approve-completion` - Approve task
- `POST /tasks/:taskId/reject-completion` - Reject task with reason
- `DELETE /tasks/cleanup/old-approved` - Delete old approved tasks

### Permissions
- Only task creator (assignedBy) can approve/reject
- Checked on both frontend and backend
- 403 error if unauthorized user attempts action
