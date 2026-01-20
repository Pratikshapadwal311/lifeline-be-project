/**
 * Authentication Controller
 * Handles user registration, login, and authentication
 */

const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }
    
    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      fullName
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName
        }
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
