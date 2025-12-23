import StatusDropdown from './StatusDropdown';

export default function TaskItem({ task, onStatusChange, canEdit, canDelete, onDelete, users = [] }) {
  // Helper to get user name by ID or object
  function getUserName(userRef) {
    if (!userRef) return '';
    if (typeof userRef === 'object' && userRef.name) return userRef.name;
    if (typeof userRef === 'string' && users.length) {
      const found = users.find(u => String(u._id) === String(userRef));
      return found ? found.name : '';
    }
    return '';
  }

  const assigneeName =
    task.assigneeName ||
    getUserName(task.assignedTo) ||
    'Unknown';

  const assignedByName =
    task.assignedByName ||
    getUserName(task.assignedBy) ||
    'Unknown';

  return (
    <div className="task-item">
      <div><strong>{task.title}</strong></div>
      <div>Assignee: {assigneeName}</div>
      <div>Assigned By: {assignedByName}</div>
      <div>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</div>
      <div>
        Status:&nbsp;
        {canEdit ? (
          <StatusDropdown
            value={task.status}
            onChange={status => onStatusChange(task._id || task.id, status)}
          />
        ) : (
          <span>{task.status}</span>
        )}
      </div>
      {canDelete && (
        <button
          style={{
            marginTop: '8px',
            color: 'white',
            background: 'red',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => onDelete(task._id || task.id)}
        >
          Delete Task
        </button>
      )}
    </div>
  );
}
