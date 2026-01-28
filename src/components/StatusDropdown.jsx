import React from 'react';

const allStatuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];

// Define allowed next statuses for each current status
const getValidNextStatuses = (currentStatus) => {
  const statusProgression = {
    'Not Started': ['Not Started', 'Working on it'], // Can stay or move to Working
    'Working on it': ['Working on it', 'Stuck', 'Done'], // Can stay, go to Stuck, or Done
    'Stuck': ['Stuck', 'Working on it', 'Done'], // Can stay, go back to Working, or Done
    'Done': ['Done'] // Cannot move from Done
  };
  
  return statusProgression[currentStatus] || allStatuses;
};

export default function StatusDropdown({ value, onChange }) {
  const validStatuses = getValidNextStatuses(value);
  
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '12px'
      }}
    >
      {validStatuses.map(status => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}
