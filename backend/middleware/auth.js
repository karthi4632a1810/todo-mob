const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token - authRequired middleware
exports.authRequired = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a token.',
        data: null,
        errors: ['No token provided']
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user',
        data: null,
        errors: ['User not found or inactive']
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      data: null,
      errors: [error.message]
    });
  }
};

// Alias for backward compatibility
exports.authenticate = exports.authRequired;

// Role-based access control - authorizeRoles middleware
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
        errors: ['User not authenticated']
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        data: null,
        errors: [`Current role: ${req.user.role}, Required: ${roles.join(' or ')}`]
      });
    }

    next();
  };
};

// Alias for backward compatibility
exports.authorize = exports.authorizeRoles;

// Department-based data scoping
exports.scopeByDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Directors can access all departments
  if (req.user.role === 'DIRECTOR') {
    req.departmentFilter = {};
  } 
  // HOD can access their department
  else if (req.user.role === 'HOD') {
    req.departmentFilter = { department: req.user.department };
  } 
  // Employees can only access their own data
  else {
    req.departmentFilter = { 
      department: req.user.department,
      $or: [
        { assignedTo: req.user._id },
        { assignedBy: req.user._id }
      ]
    };
  }

  next();
};

