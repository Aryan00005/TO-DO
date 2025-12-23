export const validateTask = (task: { title: string; description: string; assignedTo: string; dueDate: string }) => {
  const errors: string[] = [];
  
  if (!task.title.trim()) {
    errors.push("Task title is required");
  }
  
  if (!task.description.trim()) {
    errors.push("Task description is required");
  }
  
  if (!task.assignedTo) {
    errors.push("Please assign the task to someone");
  }
  
  if (!task.dueDate) {
    errors.push("Due date is required");
  }
  
  return errors;
};