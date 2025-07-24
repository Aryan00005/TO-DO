import React from 'react';

interface Task {
  status: string;
  priority: number;
}

interface TaskProgressProps {
  task: Task;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ task }) => {
  const getProgress = () => {
    switch (task.status) {
      case 'Not Started': return 0;
      case 'Working on it': return 50;
      case 'Stuck': return 25;
      case 'Done': return 100;
      default: return 0;
    }
  };

  const progress = getProgress();

  return (
    <div style={{
      width: '100%',
      height: '4px',
      backgroundColor: '#e5e7eb',
      borderRadius: '2px',
      overflow: 'hidden',
      marginTop: '8px'
    }}>
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: progress === 100 ? '#22c55e' : progress > 0 ? '#3b82f6' : '#e5e7eb',
          transition: 'width 0.3s ease'
        }}
      />
    </div>
  );
};

export default TaskProgress;