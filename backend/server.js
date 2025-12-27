require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow all origins (for development)
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
    // Don't exit - let the server start but log the error
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
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

