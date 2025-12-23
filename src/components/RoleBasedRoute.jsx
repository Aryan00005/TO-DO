import React, { useContext } from 'react';
import { RoleContext } from '../contexts/RoleContext';

export default function RoleBasedRoute({ allowedRoles, children }) {
  const { role } = useContext(RoleContext);
  return allowedRoles.includes(role) ? children : <div>Access Denied</div>;
}
