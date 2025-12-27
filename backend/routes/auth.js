const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

// Rate limiting for auth routes (stricter than general API)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs (increased from 5)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    data: null,
    errors: ['Rate limit exceeded']
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to allow retries
  skipSuccessfulRequests: true,
});

// Apply rate limiting to auth routes (but exclude /me endpoint which is called frequently)
router.use((req, res, next) => {
  // Skip rate limiting for /me endpoint (already authenticated)
  if (req.path === '/me' || req.path === '/logout') {
    return next();
  }
  // Apply rate limiting to other auth routes
  authLimiter(req, res, next);
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register - restricted via env flag for first Director
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // Validation
    const errors = [];
    if (!name || !name.trim()) errors.push('Name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');
    if (!department || !department.trim()) errors.push('Department is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        data: null,
        errors: ['Email already registered']
      });
    }

    // Check if this is the first Director registration
    const directorCount = await User.countDocuments({ role: 'DIRECTOR' });
    const isFirstDirector = directorCount === 0;
    const requestedRole = role || 'EMPLOYEE';

    // If trying to register as DIRECTOR and not the first one, check env flag
    if (requestedRole === 'DIRECTOR' && !isFirstDirector) {
      const allowDirectorRegistration = process.env.ALLOW_DIRECTOR_REGISTRATION === 'true';
      if (!allowDirectorRegistration) {
        return res.status(403).json({
          success: false,
          message: 'Director registration is restricted',
          data: null,
          errors: ['Director role can only be assigned by existing directors']
        });
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: requestedRole,
      department: department.trim()
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
      data: null,
      errors: [error.message]
    });
  }
});

// Login - returns JWT and user profile
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    const errors = [];
    if (!email || !email.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        errors: ['Invalid email or password']
      });
    }

    // Check password using bcrypt (handled in User model)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        errors: ['Invalid email or password']
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed',
      data: null,
      errors: [error.message]
    });
  }
});

// Forgot Password - stub
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    const errors = [];
    if (!email || !email.trim()) errors.push('Email is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    // Always return success to prevent email enumeration
    // In production, send password reset email here
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      data: null,
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process forgot password request',
      data: null,
      errors: [error.message]
    });
  }
});

// Reset Password - stub
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validation
    const errors = [];
    if (!token) errors.push('Reset token is required');
    if (!password) errors.push('Password is required');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // In production, verify reset token and update password
    // For now, this is a stub that returns success
    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password',
      data: null,
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset password',
      data: null,
      errors: [error.message]
    });
  }
});

// Get current user
router.get('/me', authRequired, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: req.user
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user profile',
      data: null,
      errors: [error.message]
    });
  }
});

// Logout (client-side token removal, but we can track it here if needed)
router.post('/logout', authRequired, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
    data: null,
    errors: null
  });
});

module.exports = router;

