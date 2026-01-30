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
  } else {
    const selectedDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (selectedDate < today) {
      errors.push("Due date cannot be in the past");
    }
  }
  
  return errors;
};