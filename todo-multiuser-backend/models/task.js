const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Not Started', 'Working on it', 'Stuck', 'Done'], 
    default: 'Not Started' 
  },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  completionRemark: { type: String, default: "" },
  dueDate: { type: Date },
  company: { type: String }, // <-- Add this line
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
