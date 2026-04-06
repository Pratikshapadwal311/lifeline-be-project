/**
 * Authentication Middleware
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new AppError('Not authorized to access this route', 401));

    const decoded = verifyToken(token);
    if (!decoded) return next(new AppError('Invalid or expired token', 401));

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) return next(new AppError('User not found or inactive', 401));

    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Authentication failed', 401));
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { protect, optionalAuth };
