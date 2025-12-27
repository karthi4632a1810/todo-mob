const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { authRequired, authorizeRoles } = require('../middleware/auth');

// Get all users (with RBAC)
router.get('/', authRequired, async (req, res) => {
  try {
    let query = {};

    // RBAC: Director - full access (including inactive), HOD - own department employees, Employee - self only
    if (req.user.role === 'DIRECTOR') {
      // Directors can see all users (active and inactive) - no filter needed
    } else if (req.user.role === 'HOD') {
      // HOD can only see employees in their department (not other HODs or Directors)
      query.department = req.user.department;
      query.role = 'EMPLOYEE';
      query.isActive = true; // HODs only see active employees
    } else {
      // Employees can only see themselves
      query._id = req.user._id;
      query.isActive = true; // Employees only see themselves if active
    }

    const users = await User.find(query).select('-password');
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: { 
        users,
        count: users.length
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve users',
      data: null,
      errors: [error.message]
    });
  }
});

// Get HODs and Employees for task assignment (DIRECTOR only)
// IMPORTANT: This route must be defined BEFORE /:id to ensure correct matching
router.get('/for-assignment', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const { role, departmentId } = req.query;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[for-assignment] Request received:', { role, departmentId, user: req.user?.email });
    }
    
    let query = { isActive: true };
    
    if (role === 'HOD') {
      query.role = 'HOD';
    } else if (role === 'EMPLOYEE') {
      query.role = 'EMPLOYEE';
      if (departmentId) {
        query.department = departmentId.trim();
      }
    } else {
      // Return both HODs and Employees if no role specified
      query.role = { $in: ['HOD', 'EMPLOYEE'] };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[for-assignment] Query:', JSON.stringify(query));
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ name: 1 });

    if (process.env.NODE_ENV === 'development') {
      console.log('[for-assignment] Found users:', users.length);
    }

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: { 
        users,
        count: users.length
      },
      errors: null
    });
  } catch (error) {
    console.error('[for-assignment] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve users',
      data: null,
      errors: [error.message]
    });
  }
});

// Get user by ID (with RBAC)
// IMPORTANT: This route must be defined AFTER /for-assignment to ensure correct matching
router.get('/:id', authRequired, async (req, res) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId format
    // This prevents routes like /for-assignment from being matched
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[users/:id] Invalid ID format:', req.params.id);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        data: null,
        errors: ['User ID must be a valid MongoDB ObjectId']
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[users/:id] Valid ID, fetching user:', req.params.id);
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
        errors: ['User does not exist or is inactive']
      });
    }

    // RBAC: Director - full access, HOD - own department employees, Employee - self only
    if (req.user.role === 'DIRECTOR') {
      // Directors can see any user
    } else if (req.user.role === 'HOD') {
      // HOD can only see employees in their department (not other HODs or Directors)
      if (user.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view users in your department',
          data: null,
          errors: ['Insufficient permissions']
        });
      }
      if (user.role !== 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view employees in your department',
          data: null,
          errors: ['Insufficient permissions']
        });
      }
    } else {
      // Employees can only see themselves
      if (user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own profile',
          data: null,
          errors: ['Insufficient permissions']
        });
      }
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user',
      data: null,
      errors: [error.message]
    });
  }
});

// Create user (with RBAC)
router.post('/', authRequired, async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // Validation
    const errors = [];
    if (!name || !name.trim()) errors.push('Name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');
    if (!department || !department.trim()) errors.push('Department is required');
    if (!role) errors.push('Role is required');
    if (role && !['DIRECTOR', 'HOD', 'EMPLOYEE'].includes(role)) {
      errors.push('Invalid role. Must be DIRECTOR, HOD, or EMPLOYEE');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // RBAC: Director - can create any user, HOD - can create employees in their department, Employee - cannot create users
    if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employees cannot create users',
        data: null,
        errors: ['Insufficient permissions']
      });
    }

    if (req.user.role === 'HOD') {
      // HOD can only create employees in their department
      if (role !== 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. HOD can only create employees',
          data: null,
          errors: ['HOD can only create employees']
        });
      }
      if (department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. HOD can only create users in their department',
          data: null,
          errors: ['Department mismatch']
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        data: null,
        errors: ['Email already registered']
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      department: department.trim()
    });

    // Return user without password (handled by toJSON method)
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create user',
      data: null,
      errors: [error.message]
    });
  }
});

// Update user (with RBAC)
router.patch('/:id', authRequired, async (req, res) => {
  try {
    const { name, email, role, department, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
        errors: ['User does not exist']
      });
    }

    // RBAC: Director - can update any user, HOD - can update employees in their department, Employee - can only update self
    const isUpdatingSelf = req.params.id === req.user._id.toString();

    if (req.user.role === 'EMPLOYEE' && !isUpdatingSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile',
        data: null,
        errors: ['Insufficient permissions']
      });
    }

    if (req.user.role === 'HOD') {
      // HOD can only update users in their department
      if (user.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update users in your department',
          data: null,
          errors: ['Department mismatch']
        });
      }
      // HOD cannot update role or department
      if (role !== undefined || department !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. HOD cannot change user role or department',
          data: null,
          errors: ['Insufficient permissions']
        });
      }
    }

    // Update fields
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailExists = await User.findOne({ 
        email: email.trim().toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
          data: null,
          errors: ['Email must be unique']
        });
      }
      user.email = email.trim().toLowerCase();
    }
    if (password !== undefined) {
      user.password = password; // Will be hashed by pre-save hook
    }
    // Only Director can update role, department, and isActive
    if (req.user.role === 'DIRECTOR') {
      if (role !== undefined) user.role = role;
      if (department !== undefined) user.department = department.trim();
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();

    // Return user without password (handled by toJSON method)
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user',
      data: null,
      errors: [error.message]
    });
  }
});

// Delete user (only DIRECTOR)
router.delete('/:id', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
        errors: ['User does not exist']
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: null,
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

