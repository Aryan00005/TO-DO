import React from 'react';
import StatusDropdown from './StatusDropdown';

export default function TaskItem({ task, onStatusChange, canEdit, canDelete, onDelete }) {
  // Get assignee name from populated or non-populated task
  const assigneeName =
    task.assigneeName ||
    (typeof task.assignedTo === 'object' && task.assignedTo && task.assignedTo.name)
    || '';

  return (
    <div className="task-item">
      <div><strong>{task.title}</strong></div>
      <div>Assignee: {assigneeName}</div>
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
