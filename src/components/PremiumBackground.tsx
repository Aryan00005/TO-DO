import React from 'react';

const PremiumBackground: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      opacity: 0.05,
      pointerEvents: 'none',
      zIndex: -1
    }} />
  );
};

export default PremiumBackground;