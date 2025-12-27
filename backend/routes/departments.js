const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { authRequired, authorizeRoles } = require('../middleware/auth');

// Get all departments (public endpoint for registration)
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    
    res.json({
      success: true,
      message: 'Departments retrieved successfully',
      data: { departments },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve departments',
      data: null,
      errors: [error.message]
    });
  }
});

// Create department (Director only)
router.post('/', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Validation
    const errors = [];
    if (!name || !name.trim()) {
      errors.push('Department name is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({ 
      name: name.trim(),
      isActive: true 
    });
    
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists',
        data: null,
        errors: ['Department name must be unique']
      });
    }

    // Create department
    const department = await Department.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      description: description ? description.trim() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department },
      errors: null
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists',
        data: null,
        errors: ['Department name must be unique']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create department',
      data: null,
      errors: [error.message]
    });
  }
});

// Update department (Director only)
router.patch('/:id', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;

    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
        data: null,
        errors: ['Department does not exist']
      });
    }

    // Check if name is being updated and if it conflicts with existing department
    if (name && name.trim() !== department.name) {
      const existingDepartment = await Department.findOne({ 
        name: name.trim(),
        isActive: true,
        _id: { $ne: req.params.id }
      });
      
      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: 'Department with this name already exists',
          data: null,
          errors: ['Department name must be unique']
        });
      }
    }

    // Update fields
    if (name !== undefined) department.name = name.trim();
    if (code !== undefined) department.code = code ? code.trim().toUpperCase() : undefined;
    if (description !== undefined) department.description = description ? description.trim() : undefined;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { department },
      errors: null
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists',
        data: null,
        errors: ['Department name must be unique']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update department',
      data: null,
      errors: [error.message]
    });
  }
});

// Delete department (Director only) - Soft delete by setting isActive to false
router.delete('/:id', authRequired, authorizeRoles('DIRECTOR'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
        data: null,
        errors: ['Department does not exist']
      });
    }

    // Soft delete - set isActive to false
    department.isActive = false;
    await department.save();

    res.json({
      success: true,
      message: 'Department deleted successfully',
      data: null,
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete department',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

