const mongoose = require('mongoose');

const assigneeStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ['Not Started', 'Working on it', 'Stuck', 'Done'], 
    default: 'Not Started' 
  },
  completionRemark: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  assigneeStatuses: [assigneeStatusSchema], // <-- NEW FIELD
  status: { 
    type: String, 
    enum: ['Not Started', 'Working on it', 'Stuck', 'Done'], 
    default: 'Not Started' 
  },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  completionRemark: { type: String, default: "" },
  dueDate: { type: Date },
  company: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Fix OverwriteModelError by reusing model if it exists
module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
