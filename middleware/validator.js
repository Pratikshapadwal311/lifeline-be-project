/**
 * Input Validation Middleware
 * Sanitizes and validates profile data
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for profile creation
 */
const validateProfile = [
  // Full Name
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .escape(),
  
  // Age
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
  
  // Gender
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other', 'Prefer not to say']).withMessage('Invalid gender value'),
  
  // Blood Group
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).withMessage('Invalid blood group'),
  
  // Allergies
  body('allergies')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Allergies field cannot exceed 500 characters')
    .escape(),
  
  // Medical Conditions
  body('medicalConditions')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Medical conditions field cannot exceed 1000 characters')
    .escape(),
  
  // Medications
  body('medications')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Medications field cannot exceed 1000 characters')
    .escape(),
  
  // Emergency Contact Name
  body('emergencyContactName')
    .trim()
    .notEmpty().withMessage('Emergency contact name is required')
    .isLength({ max: 100 }).withMessage('Contact name cannot exceed 100 characters')
    .escape(),
  
  // Emergency Contact Number (Indian phone numbers only)
  body('emergencyContactNumber')
    .trim()
    .notEmpty().withMessage('Emergency contact number is required')
    .custom((value) => {
      // Remove spaces, dashes, and parentheses for validation
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      
      // Indian phone number patterns:
      // +91 followed by 10 digits starting with 6-9
      // 0 followed by 10 digits starting with 6-9
      // 10 digits directly starting with 6-9
      const indianPhoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
      
      if (!indianPhoneRegex.test(cleanPhone)) {
        throw new Error('Please enter a valid Indian phone number (10 digits starting with 6-9, or +91-XXXXXXXXXX)');
      }
      
      // Extract only digits
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      
      // Validate length based on format
      if (cleanPhone.startsWith('+91')) {
        if (digitsOnly.length !== 12) {
          throw new Error('Indian phone number with +91 should have 12 digits total (+91 + 10 digits)');
        }
      } else if (cleanPhone.startsWith('0')) {
        if (digitsOnly.length !== 11) {
          throw new Error('Indian phone number starting with 0 should have 11 digits total (0 + 10 digits)');
        }
      } else {
        if (digitsOnly.length !== 10) {
          throw new Error('Indian phone number should have exactly 10 digits');
        }
      }
      
      return true;
    }),
  
  // Notes
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes field cannot exceed 2000 characters')
    .escape()
];

/**
 * Middleware to check validation results
 */
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  validateProfile,
  checkValidation
};
