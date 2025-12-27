const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
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
    // Employees can see tasks assigned to them
    query.assignedTo = req.user._id;
    return query;
  }
};

// Get pending approvals (for HOD and DIRECTOR)
router.get('/pending', authRequired, authorizeRoles('HOD', 'DIRECTOR'), async (req, res) => {
  try {
    let query = {
      status: 'PENDING'
    };

    // Apply department scope
    query = applyDepartmentScope(req, query);

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Pending approvals retrieved successfully',
      data: {
        tasks,
        count: tasks.length
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve pending approvals',
      data: null,
      errors: [error.message]
    });
  }
});

// Approve task
router.post('/:id/approve', authRequired, authorizeRoles('HOD', 'DIRECTOR'), async (req, res) => {
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

    // Additional check: HOD can only approve tasks in their department
    if (req.user.role === 'HOD' && task.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve tasks in your department',
        data: null,
        errors: ['Department scope violation']
      });
    }

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve a completed or cancelled task',
        data: null,
        errors: ['Invalid task status']
      });
    }

    task.status = 'IN_PROGRESS';
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    res.json({
      success: true,
      message: 'Task approved successfully',
      data: { task: populatedTask },
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve task',
      data: null,
      errors: [error.message]
    });
  }
});

// Reject task
router.post('/:id/reject', authRequired, authorizeRoles('HOD', 'DIRECTOR'), async (req, res) => {
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

    // Additional check: HOD can only reject tasks in their department
    if (req.user.role === 'HOD' && task.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject tasks in your department',
        data: null,
        errors: ['Department scope violation']
      });
    }

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject a completed or cancelled task',
        data: null,
        errors: ['Invalid task status']
      });
    }

    task.status = 'CANCELLED';
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    res.json({
      success: true,
      message: 'Task rejected successfully',
      data: { task: populatedTask },
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reject task',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

