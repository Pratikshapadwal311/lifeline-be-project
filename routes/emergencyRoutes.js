/**
 * Emergency Routes
 * Public routes for emergency information access
 */

const express = require('express');
const router = express.Router();
const { getEmergencyInfo } = require('../controllers/emergencyController');

/**
 * GET /emergency/:id
 * Get emergency information by unique ID (public, no authentication)
 */
router.get('/:id', getEmergencyInfo);

module.exports = router;
