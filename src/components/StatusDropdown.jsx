import React from 'react';

const statuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];

export default function StatusDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {statuses.map(status => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}
