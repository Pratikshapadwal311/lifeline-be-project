/**
 * Emergency Routes
 * Public routes for emergency information access
 */

const express = require('express');
const router = express.Router();
const {
  getEmergencyInfo, getFirstAid, reportScanLocation,
  sendHelperOtp, verifyHelperOtp,
  approveAccessRequest, rejectAccessRequest, getAccessRequestStatus
} = require('../controllers/emergencyController');

router.get('/:id',                               getEmergencyInfo);
router.get('/:id/firstaid',                      getFirstAid);
router.post('/:id/location',                     reportScanLocation);
router.post('/:id/helper-otp',                   sendHelperOtp);
router.post('/:id/verify-helper-otp',            verifyHelperOtp);
router.get('/:id/approve/:requestId',            approveAccessRequest);
router.get('/:id/reject/:requestId',             rejectAccessRequest);
router.get('/:id/request-status/:requestId',     getAccessRequestStatus);

module.exports = router;
