const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const taskUpdateSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']
  },
  previousStatus: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']
  },
  remarks: {
    type: String,
    trim: true
  },
  replies: [replySchema]
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  isDailyPlan: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  hodApproved: {
    type: Boolean,
    default: false
  },
  hodApprovedAt: {
    type: Date
  },
  hodApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  directorApproved: {
    type: Boolean,
    default: false
  },
  directorApprovedAt: {
    type: Date
  },
  directorApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updates: [taskUpdateSchema]
}, {
  timestamps: true
});

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'COMPLETED' || this.status === 'CANCELLED') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Method to calculate days overdue
taskSchema.methods.getDaysOverdue = function() {
  if (!this.dueDate || this.status === 'COMPLETED' || this.status === 'CANCELLED') {
    return 0;
  }
  const now = new Date();
  if (now > this.dueDate) {
    const diffTime = now - this.dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
};

// Ensure virtual fields are included in JSON
taskSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);

