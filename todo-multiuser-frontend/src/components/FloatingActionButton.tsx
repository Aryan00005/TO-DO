import React from 'react';
import { FaPlus } from 'react-icons/fa';

interface FloatingActionButtonProps {
  onAction: (action: string) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onAction }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <button
        onClick={() => onAction('task')}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        title="Create Task"
      >
        <FaPlus size={20} />
      </button>
    </div>
  );
};

export default FloatingActionButton;