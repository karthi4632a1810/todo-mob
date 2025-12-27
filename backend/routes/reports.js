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
    // Employees can see only their own tasks
    query.assignedTo = req.user._id;
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

// Get task statistics with optional date filtering
router.get('/stats', authRequired, async (req, res) => {
  try {
    let query = {};
    query = applyDepartmentScope(req, query);

    // Parse date range from query parameters
    let fromDate = req.query.from ? new Date(req.query.from) : null;
    let toDate = req.query.to ? new Date(req.query.to) : null;

    // Validate dates
    if (fromDate && isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid from date format',
        data: null,
        errors: ['from parameter must be a valid date (YYYY-MM-DD)']
      });
    }

    if (toDate && isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid to date format',
        data: null,
        errors: ['to parameter must be a valid date (YYYY-MM-DD)']
      });
    }

    // Add date range filter if provided (filter by createdAt)
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = fromDate;
      }
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Director-only filters: employeeId, hodId, department
    // Only apply these filters if user is Director
    if (req.user.role === 'DIRECTOR') {
      if (req.query.employeeId) {
        // Filter by specific employee
        query.assignedTo = req.query.employeeId;
        // Also apply department filter if provided
        if (req.query.department) {
          query.department = req.query.department;
        }
      } else if (req.query.hodId) {
        // Filter by specific HOD only (not all employees in their department)
        query.assignedTo = req.query.hodId;
        // Also apply department filter if provided
        if (req.query.department) {
          query.department = req.query.department;
        }
      } else if (req.query.department) {
        // Filter by department only
        query.department = req.query.department;
      }
    }

    const stats = {
      total: await Task.countDocuments(query),
      pending: await Task.countDocuments({ ...query, status: 'PENDING' }),
      inProgress: await Task.countDocuments({ ...query, status: 'IN_PROGRESS' }),
      completed: await Task.countDocuments({ ...query, status: 'COMPLETED' }),
      cancelled: await Task.countDocuments({ ...query, status: 'CANCELLED' })
    };

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: { 
        stats,
        dateRange: {
          from: fromDate ? fromDate.toISOString().split('T')[0] : null,
          to: toDate ? toDate.toISOString().split('T')[0] : null
        }
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve statistics',
      data: null,
      errors: [error.message]
    });
  }
});

// Get tasks by department (DIRECTOR only)
router.get('/by-department', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const tasksByDepartment = await Task.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      message: 'Tasks by department retrieved successfully',
      data: { tasksByDepartment },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve tasks by department',
      data: null,
      errors: [error.message]
    });
  }
});

// Get user performance (HOD and DIRECTOR)
router.get('/user-performance', authRequired, authorizeRoles('HOD', 'DIRECTOR'), async (req, res) => {
  try {
    let matchQuery = {};
    matchQuery = applyDepartmentScope(req, matchQuery);

    const userPerformance = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$assignedTo',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    res.json({
      success: true,
      message: 'User performance retrieved successfully',
      data: { userPerformance },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user performance',
      data: null,
      errors: [error.message]
    });
  }
});

// Get summary report with overall stats, department completion %, overdue count, and top pending tasks
router.get('/summary', authRequired, async (req, res) => {
  try {
    // Parse date range from query parameters
    let fromDate = req.query.from ? new Date(req.query.from) : null;
    let toDate = req.query.to ? new Date(req.query.to) : null;

    // Validate dates
    if (fromDate && isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid from date format',
        data: null,
        errors: ['from parameter must be a valid date (YYYY-MM-DD)']
      });
    }

    if (toDate && isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid to date format',
        data: null,
        errors: ['to parameter must be a valid date (YYYY-MM-DD)']
      });
    }

    // Build base query with department scope
    let query = {};
    query = applyDepartmentScope(req, query);

    // Add date range filter if provided
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = fromDate;
      }
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Get overall task counts by status
    const taskCountsByStatus = {
      PENDING: await Task.countDocuments({ ...query, status: 'PENDING' }),
      IN_PROGRESS: await Task.countDocuments({ ...query, status: 'IN_PROGRESS' }),
      COMPLETED: await Task.countDocuments({ ...query, status: 'COMPLETED' }),
      CANCELLED: await Task.countDocuments({ ...query, status: 'CANCELLED' })
    };

    const totalTasks = Object.values(taskCountsByStatus).reduce((sum, count) => sum + count, 0);

    // Get department-wise completion percentage
    let departmentQuery = {};
    if (req.user.role === 'DIRECTOR') {
      // Director sees all departments
      departmentQuery = {};
    } else if (req.user.role === 'HOD') {
      // HOD sees only their department
      departmentQuery = { department: req.user.department };
    } else {
      // Employee sees only their own tasks
      departmentQuery = { assignedTo: req.user._id };
    }

    // Add date range to department query
    if (fromDate || toDate) {
      departmentQuery.createdAt = {};
      if (fromDate) {
        departmentQuery.createdAt.$gte = fromDate;
      }
      if (toDate) {
        departmentQuery.createdAt.$lte = toDate;
      }
    }

    const departmentStats = await Task.aggregate([
      { $match: departmentQuery },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          department: '$_id',
          total: 1,
          completed: 1,
          completionPercentage: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
            ]
          }
        }
      },
      { $sort: { department: 1 } }
    ]);

    // Get overdue count
    const now = new Date();
    const overdueQuery = {
      ...query,
      dueDate: { $lt: now },
      status: { $nin: ['COMPLETED', 'CANCELLED'] }
    };
    const overdueCount = await Task.countDocuments(overdueQuery);

    // Get top pending tasks (limit 10, sorted by priority and due date)
    const topPendingTasks = await Task.find({
      ...query,
      status: 'PENDING'
    })
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .sort({ 
        priority: -1, // HIGH first (HIGH > MEDIUM > LOW)
        dueDate: 1,   // Earliest due date first
        createdAt: -1 // Most recent first
      })
      .limit(10)
      .lean();

    // Add overdue info to pending tasks
    const pendingTasksWithOverdue = topPendingTasks.map(task => {
      const taskObj = { ...task };
      taskObj.isOverdue = isOverdue(task);
      taskObj.daysOverdue = task.dueDate && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && now > task.dueDate
        ? Math.ceil((now - task.dueDate) / (1000 * 60 * 60 * 24))
        : 0;
      return taskObj;
    });

    // Calculate priority order for sorting (HIGH=3, MEDIUM=2, LOW=1)
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    pendingTasksWithOverdue.sort((a, b) => {
      // Sort by priority first (descending)
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      // Then by overdue status (overdue first)
      if (a.isOverdue !== b.isOverdue) {
        return b.isOverdue - a.isOverdue;
      }
      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      // Finally by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      message: 'Summary report retrieved successfully',
      data: {
        dateRange: {
          from: fromDate ? fromDate.toISOString().split('T')[0] : null,
          to: toDate ? toDate.toISOString().split('T')[0] : null
        },
        overallTaskCounts: {
          ...taskCountsByStatus,
          total: totalTasks
        },
        departmentCompletion: departmentStats,
        overdueCount,
        topPendingTasks: pendingTasksWithOverdue.slice(0, 10)
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve summary report',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

