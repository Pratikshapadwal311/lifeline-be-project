/**
 * Profile Routes
 * API routes for profile management
 */

const express = require('express');
const router = express.Router();
const { createProfile, getProfile, getMyProfile, updateProfile } = require('../controllers/profileController');
const { validateProfile, checkValidation } = require('../middleware/validator');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/profile
 * Create a new emergency profile (optional auth - allows anonymous profiles)
 */
router.post('/', optionalAuth, validateProfile, checkValidation, createProfile);

/**
 * GET /api/profile/mine
 * Get the logged-in user's own profile ID (must be before /:id)
 */
router.get('/mine', protect, getMyProfile);

/**
 * GET /api/profile/:id
 * Get full profile by ID (requires authentication — owner only)
 */
router.get('/:id', protect, getProfile);

/**
 * PUT /api/profile/:id
 * Update profile by ID (requires authentication)
 */
router.put('/:id', protect, validateProfile, checkValidation, updateProfile);

module.exports = router;
