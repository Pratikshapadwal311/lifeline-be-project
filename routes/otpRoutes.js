/**
 * OTP Routes
 * Routes for OTP request and verification
 */

const express = require('express');
const router = express.Router();
const { requestOTP, verifyOTP } = require('../controllers/otpController');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Rate limiter for OTP requests (prevent abuse)
 * Max 3 requests per 15 minutes per IP
 */
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: 'Too many OTP requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for OTP verification (prevent brute force)
 * Max 5 attempts per 15 minutes per IP
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many OTP verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/request-otp/:id
 * Request OTP for sensitive data access
 */
router.post('/request-otp/:id', 
  otpRequestLimiter,
  [
    body('contact').optional().isEmail().withMessage('Contact must be a valid email')
  ],
  validate,
  requestOTP
);

/**
 * POST /api/verify-otp/:id
 * Verify OTP and get sensitive data
 */
router.post('/verify-otp/:id',
  otpVerifyLimiter,
  [
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be exactly 6 digits')
  ],
  validate,
  verifyOTP
);

module.exports = router;
