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
 * Body: { phone: "registered emergency contact phone number" }
 */
const requestOTP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!id || id.length < 10) {
      return next(new AppError('Invalid profile ID', 400));
    }

    if (!phone) {
      return next(new AppError('Please provide your phone number to receive the OTP', 400));
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return next(new AppError('Please enter a valid 10-digit phone number', 400));
    }

    // Get profile
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    // Check if there's an existing valid OTP
    const profileWithOtp = await Profile.findOne({ uniqueId: id }).select('+otp.code');
    if (profileWithOtp.otp && profileWithOtp.otp.code && !isOTPExpired(profileWithOtp.otp.expiresAt)) {
      await sendOTP(phone, profileWithOtp.otp.code);

      return res.status(200).json({
        success: true,
        message: `OTP sent to your phone number ending in ${cleanPhone.slice(-4)}`,
        data: {
          expiresIn: Math.floor((new Date(profileWithOtp.otp.expiresAt) - new Date()) / 1000 / 60) + ' minutes'
        }
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiry(5);
    const deviceInfo = getDeviceInfo(req);

    // Save OTP to profile
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

    // Notify emergency contact that someone is accessing the profile
    if (profile.emergencyContactNumber) {
      notifyOTPRequest(profile.emergencyContactNumber, deviceInfo);
    }

    // Send OTP to the rescuer's phone number
    await sendOTP(phone, otpCode);

    res.status(200).json({
      success: true,
      message: `OTP sent to your phone number ending in ${cleanPhone.slice(-4)}`,
      data: {
        expiresIn: '5 minutes'
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

    // Get full profile for sensitive data
    const fullProfile = await Profile.findOne({ uniqueId: id });

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
        knownTriggers: fullProfile.knownTriggers || null,
        organDonor: fullProfile.organDonor || false,
        doctorName: fullProfile.doctorName || null,
        doctorPhone: fullProfile.doctorPhone || null,
        preferredHospital: fullProfile.preferredHospital || null,
        insuranceProvider: fullProfile.insuranceProvider || null,
        insurancePolicyNumber: fullProfile.insurancePolicyNumber || null,
        governmentIdNumber: fullProfile.governmentIdNumber || null,
        dietaryRestrictions: fullProfile.dietaryRestrictions || null,
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
