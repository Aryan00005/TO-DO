import React from 'react';
import { FaTrash, FaUser, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done': return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'Working on it': return <FaClock style={{ color: '#f59e0b' }} />;
      case 'Stuck': return <FaExclamationTriangle style={{ color: '#ef4444' }} />;
      default: return <FaClock style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return '#10b981';
      case 'Working on it': return '#f59e0b';
      case 'Stuck': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      padding: '20px'
    }}>
      {Object.keys(grouped).map(status => (
        <div key={status} style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {getStatusIcon(status)}
            {status} ({grouped[status].length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {grouped[status].map(task => {
              const currentUserId = getCurrentUserId();
              const assignerId = getAssignerId(task);
              return (
                <div key={task._id || task.id} style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: 0,
                      flex: 1
                    }}>{task.title}</h4>
                    
                    {assignerId === currentUserId && (
                      <button
                        onClick={() => onDeleteTask(task._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete task"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      <FaUser size={12} />
                      Assignees:
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {task.assignedTo.map(userId => {
                        const user = users.find(u => u._id === userId);
                        const statusObj = task.assigneeStatuses?.find(s => s.user === userId);
                        const isCurrentUser = userId === currentUserId;
                        const userStatus = statusObj?.status || "Not Started";
                        
                        return (
                          <div key={userId} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flex: 1
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: getStatusColor(userStatus)
                              }}></div>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#374151'
                              }}>
                                {user?.name || userId}
                              </span>
                            </div>
                            
                            <div style={{ flex: 1, marginLeft: '12px' }}>
                              {isCurrentUser ? (
                                <select
                                  value={userStatus}
                                  onChange={e =>
                                    onStatusChange(task._id, userId, e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    background: '#fff',
                                    color: getStatusColor(userStatus)
                                  }}
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="Working on it">Working on it</option>
                                  <option value="Stuck">Stuck</option>
                                  <option value="Done">Done</option>
                                </select>
                              ) : (
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: getStatusColor(userStatus),
                                  padding: '2px 8px',
                                  background: `${getStatusColor(userStatus)}20`,
                                  borderRadius: '12px'
                                }}>
                                  {userStatus}
                                </span>
                              )}
                            </div>
                            
                            {statusObj?.completionRemark && (
                              <div style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                                marginLeft: '8px'
                              }}>
                                "{statusObj.completionRemark}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
