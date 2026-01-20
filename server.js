/**
 * ICE - In Case of Emergency
 * Main Server File
 * 
 * Express server for QR-based medical information application
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const otpRoutes = require('./routes/otpRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet()); // Set security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting for public endpoints
const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // More restrictive for API endpoints
  message: 'Too many API requests, please try again later.'
});

// Apply rate limiting
app.use('/emergency', emergencyLimiter);
app.use('/api', apiLimiter);

// Serve static files (frontend)
// Serve HTML, CSS, JS files from root directory
app.use(express.static('.', { 
    index: false,
    dotfiles: 'ignore'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'ICE Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', otpRoutes); // OTP routes: /api/request-otp/:id, /api/verify-otp/:id
app.use('/emergency', emergencyRoutes);

// Serve frontend HTML files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ice-db', {
      // Mongoose 6+ no longer needs these options, but keeping for compatibility
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Bind to 0.0.0.0 to allow access from network (for mobile QR code scanning)
    app.listen(PORT, '0.0.0.0', () => {
      const { getLocalIP } = require('./utils/networkUtils');
      const localIP = getLocalIP();
      
      console.log(`🚀 ICE Backend Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Local access: http://localhost:${PORT}/health`);
      console.log(`📲 Network access: http://${localIP}:${PORT}/health`);
      console.log(`\n💡 For mobile QR code scanning, use: http://${localIP}:${PORT}`);
      console.log(`   Make sure your phone is on the same WiFi network!\n`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
