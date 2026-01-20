/**
 * OTP Controller
 * Handles OTP generation, request, and verification for sensitive data access
 */

const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');
const { generateOTP, validateOTP, getOTPExpiry, isOTPExpired } = require('../utils/otpGenerator');
const { notifyOTPRequest, sendOTP, getDeviceInfo } = require('../utils/notifications');

/**
 * Request OTP for sensitive data access
 * POST /api/request-otp/:id
 */
const requestOTP = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || id.length < 10) {
      return next(new AppError('Invalid profile ID', 400));
    }
    
    // Get profile
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }
    
    // Check if there's an existing valid OTP
    if (profile.otp && profile.otp.code && !isOTPExpired(profile.otp.expiresAt)) {
      // Return existing OTP (don't generate new one)
      const deviceInfo = getDeviceInfo(req);
      
      // Notify owner
      if (profile.ownerNotificationContact) {
        notifyOTPRequest(profile.ownerNotificationContact, deviceInfo);
      }
      
      // Send OTP to requester (in dev: console, in prod: SMS/Email)
      // For now, we'll send to a mock contact or console
      sendOTP('scanner@example.com', profile.otp.code);
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          expiresIn: Math.floor((new Date(profile.otp.expiresAt) - new Date()) / 1000 / 60) + ' minutes'
        }
      });
    }
    
    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiry(5); // 5 minutes expiry
    const deviceInfo = getDeviceInfo(req);
    
    // Update profile with OTP
    await Profile.findOneAndUpdate(
      { uniqueId: id },
      {
        otp: {
          code: otpCode,
          expiresAt: expiresAt,
          requestedAt: new Date(),
          requestedByDevice: deviceInfo
        }
      }
    );
    
    // Notify owner
    if (profile.ownerNotificationContact) {
      notifyOTPRequest(profile.ownerNotificationContact, deviceInfo);
    }
    
    // Send OTP to requester
    // In development: console log
    // In production: send via SMS/Email to the person requesting
    // For now, we'll use a placeholder or get from request
    const requesterContact = req.body.contact || 'scanner@example.com';
    sendOTP(requesterContact, otpCode);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Check console/logs for development mode.',
      data: {
        expiresIn: '5 minutes',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { 
          otp: otpCode,
          note: 'OTP included in development mode only'
        })
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and return sensitive data
 * POST /api/verify-otp/:id
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    // Validate inputs
    if (!id || id.length < 10) {
      return next(new AppError('Invalid profile ID', 400));
    }
    
    if (!otp || otp.length !== 6) {
      return next(new AppError('OTP must be 6 digits', 400));
    }
    
    // Get profile with OTP
    const profile = await Profile.findOne({ uniqueId: id }).select('+otp.code');
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }
    
    // Validate OTP
    const validation = validateOTP(otp, profile.otp?.code, profile.otp?.expiresAt);
    if (!validation.valid) {
      return next(new AppError(validation.message, 400));
    }
    
    // OTP is valid - get full profile for sensitive data
    const fullProfile = await Profile.findOne({ uniqueId: id });
    
    if (!fullProfile) {
      return next(new AppError('Profile not found', 404));
    }
    
    // Clear OTP after successful verification (single-use)
    await Profile.findOneAndUpdate(
      { uniqueId: id },
      {
        $unset: {
          'otp.code': '',
          'otp.expiresAt': '',
          'otp.requestedAt': '',
          'otp.requestedByDevice': ''
        }
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        medicalConditions: fullProfile.medicalConditions || 'None',
        allergies: fullProfile.allergies || 'None',
        medications: fullProfile.medications || 'None',
        organDonor: fullProfile.organDonor || false,
        address: fullProfile.address || null,
        city: fullProfile.city || null,
        state: fullProfile.state || null,
        photo_url: fullProfile.photo_url || null,
        notes: fullProfile.notes || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestOTP,
  verifyOTP
};
