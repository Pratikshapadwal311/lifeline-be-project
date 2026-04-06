/**
 * Emergency Routes
 * Public routes for emergency information access
 */

const express = require('express');
const router = express.Router();
const { getEmergencyInfo, getFirstAid } = require('../controllers/emergencyController');

/**
 * GET /emergency/:id
 * Get emergency information by unique ID (public, no authentication)
 */
router.get('/:id', getEmergencyInfo);

/**
 * GET /emergency/:id/firstaid
 * Get first aid instructions based on patient's medical conditions
 */
router.get('/:id/firstaid', getFirstAid);

module.exports = router;
