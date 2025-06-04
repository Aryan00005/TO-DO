export const ROLES = ['superior', 'subordinate', 'subsubordinate', 'juniormost'];

export function canAssignTask(fromRole, toRole) {
  return ROLES.indexOf(fromRole) < ROLES.indexOf(toRole);
}
