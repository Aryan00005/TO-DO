import TaskItem from './TaskItem';

export default function TaskBoard({ tasks, onStatusChange, onDeleteTask, currentUser, users }) {
  // Helper to get the assignee's ID as a string
  const getAssigneeId = (task) => {
    if (!task) return '';
    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      return String(task.assignedTo._id);
    }
    return String(task.assignedTo || task.assigneeId || '');
  };

  // Helper to get the assigner's ID as a string
  const getAssignerId = (task) => {
    if (!task) return '';
    if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
      return String(task.assignedBy._id);
    }
    return String(task.assignedBy || task.assignerId || '');
  };

  const getCurrentUserId = () => String(currentUser._id || currentUser.id || '');

  // Group tasks by status
  const grouped = tasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {});

  return (
    <div className="task-board">
      {Object.keys(grouped).map(status => (
        <div key={status}>
          <h3>{status}</h3>
          {grouped[status].map(task => {
            const assigneeId = getAssigneeId(task);
            const assignerId = getAssignerId(task);
            const currentUserId = getCurrentUserId();
            const canEdit = assigneeId === currentUserId; // Only assignee can change status
            const canDelete = assignerId === currentUserId; // Only assigner can delete
            return (
              <TaskItem
                key={task._id || task.id}
                task={task}
                onStatusChange={onStatusChange}
                canEdit={canEdit}
                canDelete={canDelete}
                onDelete={onDeleteTask}
                users={users} // Pass users here!
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
