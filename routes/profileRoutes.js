/**
 * Profile Routes
 * API routes for profile management
 */

const express = require('express');
const router = express.Router();
const { createProfile, getProfile, updateProfile } = require('../controllers/profileController');
const { validateProfile, checkValidation } = require('../middleware/validator');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/profile
 * Create a new emergency profile (optional auth - allows anonymous profiles)
 */
router.post('/', optionalAuth, validateProfile, checkValidation, createProfile);

/**
 * GET /api/profile/:id
 * Get full profile by ID (internal use)
 */
router.get('/:id', optionalAuth, getProfile);

/**
 * PUT /api/profile/:id
 * Update profile by ID (requires authentication)
 */
router.put('/:id', protect, validateProfile, checkValidation, updateProfile);

module.exports = router;
