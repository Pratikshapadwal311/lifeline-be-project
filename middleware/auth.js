/**
 * Authentication Middleware
 * Protect routes that require user authentication
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

/**
 * Protect routes - require authentication
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new AppError('Invalid or expired token', 401));
    }
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return next(new AppError('User not found or inactive', 401));
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  protect,
  optionalAuth
};
