import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#3b82f6' 
}) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        display: 'inline-block'
      }}
    />
  );
};

export default LoadingSpinner;