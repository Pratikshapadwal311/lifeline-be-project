/**
 * JWT Token Utilities
 * Generate and verify JWT tokens for authentication
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ice-emergency-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generate JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
