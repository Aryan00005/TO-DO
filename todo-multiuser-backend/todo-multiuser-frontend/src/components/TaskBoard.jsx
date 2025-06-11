
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
          const currentUserId = getCurrentUserId();
          const assignerId = getAssignerId(task);
          return (
            <div key={task._id || task.id} className="task-item">
              <h4>{task.title}</h4>
              <div>
                <b>Assignees:</b>
                <ul>
                  {task.assignedTo.map(userId => {
                    const user = users.find(u => u._id === userId);
                    const statusObj = task.assigneeStatuses?.find(s => s.user === userId);
                    const isCurrentUser = userId === currentUserId;
                    return (
                      <li key={userId}>
                        {user?.name || userId}:
                        <span style={{ marginLeft: 8 }}>
                          {isCurrentUser ? (
                            <select
                              value={statusObj?.status || "Not Started"}
                              onChange={e =>
                                onStatusChange(task._id, userId, e.target.value)
                              }
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="Working on it">Working on it</option>
                              <option value="Stuck">Stuck</option>
                              <option value="Done">Done</option>
                            </select>
                          ) : (
                            statusObj?.status || "Not Started"
                          )}
                        </span>
                        {statusObj?.completionRemark && (
                          <span style={{ marginLeft: 8, color: "#888" }}>
                            ({statusObj.completionRemark})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {/* Optionally: show delete button for assigner */}
              {assignerId === currentUserId && (
                <button onClick={() => onDeleteTask(task._id)}>Delete</button>
              )}
            </div>
          );
        })}
      </div>
    ))}
  </div>
);
}
