/**
 * Profile Controller
 * Handles profile creation and retrieval
 */

const Profile = require('../models/Profile');
const { generateQRCodeDataURL, generateEmergencyURL } = require('../utils/qrGenerator');
const { AppError } = require('../middleware/errorHandler');
const { getBaseURLForQR } = require('../utils/networkUtils');

/**
 * Create a new emergency profile
 * POST /api/profile
 */
const createProfile = async (req, res, next) => {
  try {
    const profileData = req.body;
    
    // Get base URL for QR code generation
    // Use local IP address so mobile devices can scan QR codes
    const port = process.env.PORT || 3000;
    const baseUrl = getBaseURLForQR(port);
    
    // Link profile to user if authenticated
    if (req.user) {
      profileData.userId = req.user.id;
    }
    
    // Create profile in database
    const profile = new Profile(profileData);
    await profile.save();
    
    // Generate emergency URL
    const emergencyURL = generateEmergencyURL(profile.uniqueId, baseUrl);
    
    // Generate QR code
    const qrCodeDataURL = await generateQRCodeDataURL(emergencyURL);
    
    // Return success response with QR code
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: {
        profileId: profile.uniqueId,
        qrCode: qrCodeDataURL,
        emergencyURL: emergencyURL,
        profile: {
          fullName: profile.fullName,
          createdAt: profile.createdAt
        }
      }
    });
  } catch (error) {
    // Handle duplicate uniqueId (shouldn't happen with UUID, but just in case)
    if (error.code === 11000) {
      return next(new AppError('Profile with this ID already exists', 400));
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return next(new AppError(error.message, 400));
    }
    
    next(error);
  }
};

/**
 * Get full profile by ID (internal use)
 * GET /api/profile/:id
 */
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const profile = await Profile.getFullProfile(id);
    
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile by ID
 * PUT /api/profile/:id
 */
const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow updating uniqueId
    delete updateData.uniqueId;
    delete updateData.createdAt;
    
    const profile = await Profile.findOneAndUpdate(
      { uniqueId: id },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }
    
    // Regenerate QR code with updated profile
    const port = process.env.PORT || 3000;
    const baseUrl = getBaseURLForQR(port);
    const emergencyURL = generateEmergencyURL(profile.uniqueId, baseUrl);
    const qrCodeDataURL = await generateQRCodeDataURL(emergencyURL);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profileId: profile.uniqueId,
        qrCode: qrCodeDataURL,
        emergencyURL: emergencyURL,
        profile: {
          fullName: profile.fullName,
          updatedAt: profile.updatedAt
        }
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

module.exports = {
  createProfile,
  getProfile,
  updateProfile
};
