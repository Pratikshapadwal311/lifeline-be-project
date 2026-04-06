/**
 * First-Aider Routes
 * Handles nearby volunteer alert and count endpoints
 */

const express = require('express');
const router = express.Router();
const { alertNearby, getVolunteerCount } = require('../controllers/firstAiderController');

// POST /api/alert/nearby - alert first-aiders near a given location
router.post('/alert/nearby', alertNearby);

// GET /api/volunteers/count - get count of currently active volunteers
router.get('/volunteers/count', getVolunteerCount);

module.exports = router;
