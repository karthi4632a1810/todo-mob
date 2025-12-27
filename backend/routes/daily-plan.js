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

// Create daily plan task
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, description, assignedTo, department, startDate } = req.body;

    // Validation
    const errors = [];
    if (!title || !title.trim()) errors.push('Title is required');
    if (!startDate) errors.push('Start date is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Parse and validate start date
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format',
        data: null,
        errors: ['Start date must be a valid date']
      });
    }

    // Verify assignedTo user exists and department scope check
    let targetDepartment = department || req.user.department;
    if (assignedTo) {
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
      if (req.user.role !== 'DIRECTOR' && assignedUser.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign tasks to users in your department',
          data: null,
          errors: ['Department scope violation']
        });
      }
      targetDepartment = assignedUser.department;
    }

    // Create daily plan task with HIGH priority and isDailyPlan = true
    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      assignedTo: assignedTo || req.user._id,
      assignedBy: req.user._id,
      department: targetDepartment,
      priority: 'HIGH',
      startDate: parsedStartDate,
      isDailyPlan: true
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    // Add overdue status
    const taskObj = populatedTask.toObject();
    taskObj.isOverdue = isOverdue(populatedTask);
    taskObj.daysOverdue = populatedTask.getDaysOverdue();

    res.status(201).json({
      success: true,
      message: 'Daily plan task created successfully',
      data: { task: taskObj },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create daily plan task',
      data: null,
      errors: [error.message]
    });
  }
});

// Get daily plan tasks grouped by department and status
router.get('/', authRequired, async (req, res) => {
  try {
    // Get date from query parameter or use today
    let queryDate = req.query.date;
    if (!queryDate) {
      const today = new Date();
      queryDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }

    // Parse date and create date range (start of day to end of day)
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query
    let query = {
      isDailyPlan: true,
      priority: 'HIGH',
      startDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    // Apply department scope
    query = applyDepartmentScope(req, query);

    // Fetch tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .sort({ department: 1, status: 1, createdAt: -1 });

    // Add overdue information to each task
    const tasksWithOverdue = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.isOverdue = isOverdue(task);
      taskObj.daysOverdue = task.getDaysOverdue();
      return taskObj;
    });

    // Group by department and status
    const grouped = {};
    
    tasksWithOverdue.forEach(task => {
      const dept = task.department || 'Unassigned';
      const status = task.status || 'PENDING';

      if (!grouped[dept]) {
        grouped[dept] = {};
      }

      if (!grouped[dept][status]) {
        grouped[dept][status] = [];
      }

      grouped[dept][status].push(task);
    });

    // Convert to array format for easier consumption
    const groupedArray = Object.keys(grouped).map(department => ({
      department,
      statusGroups: Object.keys(grouped[department]).map(status => ({
        status,
        tasks: grouped[department][status],
        count: grouped[department][status].length
      })),
      totalTasks: tasksWithOverdue.filter(t => (t.department || 'Unassigned') === department).length
    }));

    res.json({
      success: true,
      message: 'Daily plan tasks retrieved successfully',
      data: {
        date: queryDate,
        grouped: groupedArray,
        summary: {
          totalTasks: tasksWithOverdue.length,
          totalDepartments: groupedArray.length,
          byStatus: {
            PENDING: tasksWithOverdue.filter(t => t.status === 'PENDING').length,
            IN_PROGRESS: tasksWithOverdue.filter(t => t.status === 'IN_PROGRESS').length,
            COMPLETED: tasksWithOverdue.filter(t => t.status === 'COMPLETED').length,
            CANCELLED: tasksWithOverdue.filter(t => t.status === 'CANCELLED').length
          }
        }
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve daily plan tasks',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

