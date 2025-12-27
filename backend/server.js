require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('ERROR: Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`  - ${envVar}`);
  });
  console.error('\nPlease create a .env file based on .env.example');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Validate JWT_SECRET strength in production
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET must be at least 32 characters long in production');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.error('ERROR: JWT_SECRET must be changed from default value in production');
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());

// CORS configuration - configurable via environment variable
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['*'];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow all origins if '*' is specified (development only)
    if (allowedOrigins.includes('*')) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('WARNING: CORS is set to allow all origins in production. This is not recommended for security.');
      }
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
    errors: ['Rate limit exceeded. Please wait a moment before trying again.']
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests in development
  skipSuccessfulRequests: process.env.NODE_ENV === 'development',
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging - use combined format
  app.use(morgan('combined'));
}

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });
    
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Please check:');
    console.error('1. MongoDB server is running');
    console.error('2. MONGODB_URI in .env is correct');
    console.error('3. Network connectivity to MongoDB');
    
    // In production, exit if database connection fails
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Cannot start server without database connection in production');
      process.exit(1);
    }
    // In development, allow server to start but log the error
  }
};

connectDB();

// Middleware to check MongoDB connection before handling requests
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    // Connection is ready (1 = connected)
    next();
  } else if (mongoose.connection.readyState === 2) {
    // Connection is connecting (2 = connecting)
    // Wait a bit and check again
    setTimeout(() => {
      if (mongoose.connection.readyState === 1) {
        next();
      } else {
        res.status(503).json({
          success: false,
          message: 'Database connection is not ready. Please try again in a moment.',
          data: null,
          errors: ['MongoDB connection pending']
        });
      }
    }, 1000);
  } else {
    // Connection is not ready (0 = disconnected, 3 = disconnecting)
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please check server logs.',
      data: null,
      errors: ['MongoDB not connected']
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/daily-plan', require('./routes/daily-plan'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error
  if (process.env.NODE_ENV === 'production') {
    // In production, log to console (consider using a logging service)
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    // In development, show full stack trace
    console.error(err.stack);
  }
  
  // Send error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
    errors: [err.message || 'An unexpected error occurred'],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
    errors: [`Route ${req.method} ${req.path} not found`]
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: Enhanced security and logging enabled');
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    // In production, log and continue (don't crash)
    // Consider using a logging service like Sentry here
  } else {
    // In development, show full error
    throw err;
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

