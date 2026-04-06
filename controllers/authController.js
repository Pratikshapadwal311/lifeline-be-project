/**
 * Authentication Controller
 * Email + Password based login and registration
 */

const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('An account with this email already exists', 400));
    }

    const user = await User.create({ email: email.toLowerCase(), password, fullName });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: { id: user._id, email: user.email, fullName: user.fullName }
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') return next(new AppError(error.message, 400));
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isCorrect = await user.comparePassword(password);
    if (!isCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user._id, email: user.email, fullName: user.fullName }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me  (protected)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user: { id: user._id, email: user.email, fullName: user.fullName, createdAt: user.createdAt }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
