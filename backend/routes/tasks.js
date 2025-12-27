const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { authRequired, authorizeRoles } = require('../middleware/auth');

// Helper function to apply department scope
const applyDepartmentScope = (req, query) => {
  if (req.user.role === 'DIRECTOR') {
    // Directors can see all tasks
    return query;
  } else if (req.user.role === 'HOD') {
    // HOD can see tasks in their department
    query.department = req.user.department;
    return query;
  } else {
    // Employees can see tasks assigned to them or in their department
    query.$or = [
      { assignedTo: req.user._id },
      { department: req.user.department, assignedBy: req.user._id }
    ];
    return query;
  }
};

// Helper function to check if task is overdue
const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
    return false;
  }
  return new Date() > task.dueDate;
};

// Create task - DIRECTOR only
router.post('/', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const { title, description, assignedTo, departmentId, priority, startDate, dueDate, parentTaskId } = req.body;

    // Validation
    const errors = [];
    if (!title || !title.trim()) errors.push('Title is required');
    if (!description || !description.trim()) errors.push('Description is required');
    if (!priority || !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      errors.push('Priority is required and must be LOW, MEDIUM, or HIGH');
    }
    if (!dueDate) errors.push('Due date is required');
    if (!assignedTo) errors.push('Assigned to is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Verify assignedTo user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || !assignedUser.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found or inactive',
        data: null,
        errors: ['User does not exist or is inactive']
      });
    }

    // Assignment Rules
    let targetDepartment;
    if (assignedUser.role === 'HOD') {
      // If assignedTo is HOD: Auto-set departmentId from HOD profile
      targetDepartment = assignedUser.department;
    } else if (assignedUser.role === 'EMPLOYEE') {
      // If assignedTo is Employee: Validate employee belongs to provided departmentId
      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department is required when assigning to Employee',
          data: null,
          errors: ['Department is required for Employee assignment']
        });
      }
      if (assignedUser.department !== departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Employee does not belong to the specified department',
          data: null,
          errors: ['Department mismatch - employee belongs to different department']
        });
      }
      targetDepartment = departmentId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tasks to HOD or Employee',
        data: null,
        errors: ['Invalid assignee role']
      });
    }

    // Verify parent task if provided
    if (parentTaskId) {
      const parentTask = await Task.findById(parentTaskId);
      if (!parentTask) {
        return res.status(404).json({
          success: false,
          message: 'Parent task not found',
          data: null,
          errors: ['Parent task does not exist']
        });
      }
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date();
    const due = new Date(dueDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date',
        data: null,
        errors: ['Start date must be a valid date']
      });
    }
    if (isNaN(due.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date',
        data: null,
        errors: ['Due date must be a valid date']
      });
    }
    if (due < start) {
      return res.status(400).json({
        success: false,
        message: 'Due date must be after start date',
        data: null,
        errors: ['Due date cannot be before start date']
      });
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignedTo: assignedTo,
      assignedBy: req.user._id,
      department: targetDepartment,
      priority: priority,
      startDate: start,
      dueDate: due,
      status: 'PENDING',
      parentTaskId: parentTaskId || null
    });

    // Create notification for assignee
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: assignedTo,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      relatedTask: task._id,
      isRead: false
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('parentTaskId', 'title status');

    // Add overdue status
    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create task',
      data: null,
      errors: [error.message]
    });
  }
});

// Get all tasks with filters
router.get('/', authRequired, async (req, res) => {
  try {
    let query = {};

    // Apply department scope
    query = applyDepartmentScope(req, query);

    // Apply filters
    if (req.query.status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
    }

    if (req.query.priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      if (validPriorities.includes(req.query.priority)) {
        query.priority = req.query.priority;
      }
    }

    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    if (req.query.departmentId) {
      // Department scope check
      if (req.user.role !== 'DIRECTOR' && req.query.departmentId !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view tasks in your department',
          data: null,
          errors: ['Department scope violation']
        });
      }
      query.department = req.query.departmentId;
    }

    if (req.query.parentTaskId) {
      query.parentTaskId = req.query.parentTaskId;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Due date range filter
    if (req.query.dueDateStart || req.query.dueDateEnd) {
      query.dueDate = {};
      if (req.query.dueDateStart) {
        query.dueDate.$gte = new Date(req.query.dueDateStart);
      }
      if (req.query.dueDateEnd) {
        query.dueDate.$lte = new Date(req.query.dueDateEnd);
      }
    }

    // My tasks only filter
    if (req.query.myTasksOnly === 'true') {
      query.assignedTo = req.user._id;
    }

    // Overdue only filter
    if (req.query.overdueOnly === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['COMPLETED', 'CANCELLED'] };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('parentTaskId', 'title status')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role')
      .sort({ createdAt: -1 });

    // Add overdue information to each task
    const tasksWithOverdue = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.isOverdue = isOverdue(task);
      taskObj.daysOverdue = task.getDaysOverdue();
      return taskObj;
    });

    res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: {
        tasks: tasksWithOverdue,
        count: tasksWithOverdue.length
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve tasks',
      data: null,
      errors: [error.message]
    });
  }
});

// Get task by ID
router.get('/:id', authRequired, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    query = applyDepartmentScope(req, query);

    const task = await Task.findOne(query)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('parentTaskId', 'title status description')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role')
      .populate('hodApprovedBy', 'name email')
      .populate('directorApprovedBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist or you do not have access']
      });
    }

    const taskObj = task.toObject();
    taskObj.isOverdue = isOverdue(task);
    taskObj.daysOverdue = task.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task retrieved successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve task',
      data: null,
      errors: [error.message]
    });
  }
});

// Update task
router.patch('/:id', authRequired, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    query = applyDepartmentScope(req, query);

    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist or you do not have access']
      });
    }

    // Check permissions: assigned user, assignedBy, HOD, or DIRECTOR can update
    const canUpdate = 
      task.assignedTo.toString() === req.user._id.toString() ||
      task.assignedBy.toString() === req.user._id.toString() ||
      (req.user.role === 'HOD' && task.department === req.user.department) ||
      req.user.role === 'DIRECTOR';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task',
        data: null,
        errors: ['Insufficient permissions']
      });
    }

    const { title, description, status, priority, dueDate, assignedTo, parentTaskId } = req.body;
    const previousStatus = task.status;

    // Update fields
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description ? description.trim() : undefined;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (parentTaskId !== undefined) {
      if (parentTaskId) {
        // Verify parent task exists and is in same department (unless DIRECTOR)
        const parentTask = await Task.findById(parentTaskId);
        if (!parentTask) {
          return res.status(404).json({
            success: false,
            message: 'Parent task not found',
            data: null,
            errors: ['Parent task does not exist']
          });
        }
        if (req.user.role !== 'DIRECTOR' && parentTask.department !== task.department) {
          return res.status(403).json({
            success: false,
            message: 'Parent task must be in the same department',
            data: null,
            errors: ['Department mismatch']
          });
        }
      }
      task.parentTaskId = parentTaskId || null;
    }

    // Only assigned user, HOD, or DIRECTOR can change assignedTo
    if (assignedTo !== undefined && 
        (req.user.role === 'HOD' || req.user.role === 'DIRECTOR' || 
         task.assignedBy.toString() === req.user._id.toString())) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found',
          data: null,
          errors: ['User does not exist']
        });
      }
      // Department scope check
      if (req.user.role !== 'DIRECTOR' && assignedUser.department !== task.department) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign tasks to users in the same department',
          data: null,
          errors: ['Department scope violation']
        });
      }
      task.assignedTo = assignedTo;
    }

    // Status update with completion tracking
    if (status !== undefined && status !== task.status) {
      task.status = status;
      if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
        task.completedAt = new Date();
      } else if (status !== 'COMPLETED' && task.completedAt) {
        task.completedAt = undefined;
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('parentTaskId', 'title status');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update task',
      data: null,
      errors: [error.message]
    });
  }
});

// Add task update/comment
// Update task progress - EMPLOYEE only
router.post('/:id/updates', authRequired, authorizeRoles('EMPLOYEE'), async (req, res) => {
  try {
    const { status, remarks } = req.body;

    // Validation
    const errors = [];
    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].includes(status)) {
      errors.push('Status is required and must be PENDING, IN_PROGRESS, COMPLETED, or BLOCKED');
    }
    if (!remarks || !remarks.trim()) {
      errors.push('Remarks are required');
    }

    // Reject disallowed fields
    const disallowedFields = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'departmentId', 'approvals'];
    const hasDisallowedFields = disallowedFields.some(field => req.body[field] !== undefined);
    if (hasDisallowedFields) {
      errors.push('Cannot update restricted fields (title, description, priority, dueDate, assignedTo, departmentId, approvals)');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Find task - employee can only update tasks assigned to them
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist']
      });
    }

    // Check if user is the assignee
    const assignedToId = task.assignedTo._id || task.assignedTo;
    if (assignedToId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update tasks assigned to you',
        data: null,
        errors: ['Not the assigned employee']
      });
    }

    // Check if task belongs to employee's department
    if (task.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Task does not belong to your department',
        data: null,
        errors: ['Department mismatch']
      });
    }

    // Reject if task is already director-approved
    if (task.directorApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update task that has been approved by Director',
        data: null,
        errors: ['Task is director-approved']
      });
    }

    // Validate status transition
    const previousStatus = task.status;
    const validTransitions = {
      'PENDING': ['IN_PROGRESS', 'BLOCKED'],
      'IN_PROGRESS': ['COMPLETED', 'BLOCKED', 'PENDING'],
      'COMPLETED': [], // Cannot change from completed
      'BLOCKED': ['PENDING', 'IN_PROGRESS'],
      'CANCELLED': [] // Cannot change from cancelled
    };

    if (previousStatus !== status) {
      const allowedTransitions = validTransitions[previousStatus] || [];
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${previousStatus} to ${status}`,
          data: null,
          errors: [`Cannot change status from ${previousStatus} to ${status}`]
        });
      }
    }

    // Update task status
    task.status = status;
    if (status === 'COMPLETED' && previousStatus !== 'COMPLETED') {
      task.completedAt = new Date();
    }

    // Create task update record
    task.updates.push({
      comment: remarks.trim(), // Store remarks as comment for backward compatibility
      remarks: remarks.trim(),
      updatedBy: req.user._id,
      status: status,
      previousStatus: previousStatus
    });

    await task.save();

    // Notify HOD if task is completed
    if (status === 'COMPLETED') {
      try {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        
        // Find HOD of the department
        const hod = await User.findOne({
          role: 'HOD',
          department: task.department,
          isActive: true
        });

        if (hod) {
          await Notification.create({
            title: 'Task Completed',
            message: `Task "${task.title}" has been completed by ${req.user.name}`,
            type: 'TASK_COMPLETED',
            recipient: hod._id,
            relatedTask: task._id,
            isRead: false
          });
        }
      } catch (notifError) {
        // Log error but don't fail the request if notification fails
        if (process.env.NODE_ENV === 'production') {
          console.error('Error creating notification:', {
            message: notifError.message,
            taskId: task._id,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('Error creating notification:', notifError);
        }
      }
    }

    // Populate and return updated task
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task progress updated successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error updating task progress:', {
        message: error.message,
        taskId: req.params.id,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error updating task progress:', error);
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update task progress',
      data: null,
      errors: [error.message]
    });
  }
});

// Add reply to task update - Director and Employee can reply
router.post('/:id/updates/:updateId/reply', authRequired, async (req, res) => {
  try {
    const { message } = req.body;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        data: null,
        errors: ['Message cannot be empty']
      });
    }

    // Find task
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist']
      });
    }

    // Check permissions: Director can reply to any task, Employee can only reply to tasks assigned to them
    if (req.user.role === 'EMPLOYEE') {
      const assignedToId = task.assignedTo._id || task.assignedTo;
      if (assignedToId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only reply to updates on tasks assigned to you',
          data: null,
          errors: ['Not the assigned employee']
        });
      }
    }

    // Find the update
    const update = task.updates.id(req.params.updateId);
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found',
        data: null,
        errors: ['Update does not exist']
      });
    }

    // Add reply
    update.replies.push({
      message: message.trim(),
      repliedBy: req.user._id
    });

    await task.save();

    // Populate and return updated task
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Error adding reply:', {
        message: error.message,
        taskId: req.params.id,
        updateId: req.params.updateId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error adding reply:', error);
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add reply',
      data: null,
      errors: [error.message]
    });
  }
});

// HOD approval
router.post('/:id/approve-hod', authRequired, authorizeRoles('HOD', 'DIRECTOR'), async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // HOD can only approve tasks in their department
    if (req.user.role === 'HOD') {
      query.department = req.user.department;
    }

    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist or you do not have access']
      });
    }

    if (task.hodApproved) {
      return res.status(400).json({
        success: false,
        message: 'Task already approved by HOD',
        data: null,
        errors: ['Task is already approved']
      });
    }

    task.hodApproved = true;
    task.hodApprovedAt = new Date();
    task.hodApprovedBy = req.user._id;

    // Add update
    task.updates.push({
      comment: 'Task approved by HOD',
      updatedBy: req.user._id,
      status: task.status,
      previousStatus: task.status
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('hodApprovedBy', 'name email')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task approved by HOD successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve task',
      data: null,
      errors: [error.message]
    });
  }
});

// Director approval
router.post('/:id/approve-director', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist']
      });
    }

    if (task.directorApproved) {
      return res.status(400).json({
        success: false,
        message: 'Task already approved by Director',
        data: null,
        errors: ['Task is already approved']
      });
    }

    task.directorApproved = true;
    task.directorApprovedAt = new Date();
    task.directorApprovedBy = req.user._id;

    // Add update
    task.updates.push({
      comment: 'Task approved by Director',
      updatedBy: req.user._id,
      status: task.status,
      previousStatus: task.status
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('directorApprovedBy', 'name email')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task approved by Director successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve task',
      data: null,
      errors: [error.message]
    });
  }
});

// Reopen task
router.post('/:id/reopen', authRequired, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    query = applyDepartmentScope(req, query);

    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist or you do not have access']
      });
    }

    if (task.status !== 'COMPLETED' && task.status !== 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Task is not completed or cancelled',
        data: null,
        errors: ['Only completed or cancelled tasks can be reopened']
      });
    }

    // Check permissions: assigned user, assignedBy, HOD, or DIRECTOR can reopen
    const canReopen = 
      task.assignedTo.toString() === req.user._id.toString() ||
      task.assignedBy.toString() === req.user._id.toString() ||
      (req.user.role === 'HOD' && task.department === req.user.department) ||
      req.user.role === 'DIRECTOR';

    if (!canReopen) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reopen this task',
        data: null,
        errors: ['Insufficient permissions']
      });
    }

    const previousStatus = task.status;
    task.status = 'IN_PROGRESS';
    task.completedAt = undefined;

    // Add update
    task.updates.push({
      comment: `Task reopened from ${previousStatus}`,
      updatedBy: req.user._id,
      status: 'IN_PROGRESS',
      previousStatus: previousStatus
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .populate('updates.updatedBy', 'name email role')
      .populate('updates.replies.repliedBy', 'name email role');

    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.json({
      success: true,
      message: 'Task reopened successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reopen task',
      data: null,
      errors: [error.message]
    });
  }
});

// Delete task
router.delete('/:id', authRequired, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    query = applyDepartmentScope(req, query);

    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        data: null,
        errors: ['Task does not exist or you do not have access']
      });
    }

    // Check permissions: Only assignedBy or DIRECTOR can delete
    const canDelete = 
      task.assignedBy.toString() === req.user._id.toString() ||
      req.user.role === 'DIRECTOR';

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task',
        data: null,
        errors: ['Insufficient permissions']
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
      data: null,
      errors: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete task',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;
