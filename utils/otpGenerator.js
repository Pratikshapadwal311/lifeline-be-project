/**
 * OTP Generator Utility
 * Generates and validates OTP codes for sensitive data access
 */

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if OTP is expired
 * @param {Date} expiresAt - Expiration date
 * @returns {boolean} True if expired
 */
function isOTPExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

/**
 * Validate OTP code
 * @param {string} enteredOTP - OTP entered by user
 * @param {string} storedOTP - OTP stored in database
 * @param {Date} expiresAt - Expiration date
 * @returns {object} { valid: boolean, message: string }
 */
function validateOTP(enteredOTP, storedOTP, expiresAt) {
  if (!enteredOTP || !storedOTP) {
    return { valid: false, message: 'OTP is required' };
  }
  
  if (isOTPExpired(expiresAt)) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (enteredOTP !== storedOTP) {
    return { valid: false, message: 'Invalid OTP code. Please try again.' };
  }
  
  return { valid: true, message: 'OTP verified successfully' };
}

/**
 * Get OTP expiry time (default: 5 minutes)
 * @param {number} minutes - Minutes until expiry (default: 5)
 * @returns {Date} Expiry date
 */
function getOTPExpiry(minutes = 5) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
}

module.exports = {
  generateOTP,
  isOTPExpired,
  validateOTP,
  getOTPExpiry
};
