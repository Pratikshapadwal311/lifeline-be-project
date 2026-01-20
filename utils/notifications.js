/**
 * Notification Utility
 * Handles notifications for QR scans and OTP requests
 * In production, integrate with email/SMS services
 */

/**
 * Send notification to QR owner
 * @param {string} contact - Email or phone number
 * @param {string} message - Notification message
 * @param {string} type - 'scan' or 'otp_request'
 */
function notifyOwner(contact, message, type = 'scan') {
  // In development: log to console
  // In production: send via email/SMS service
  
  const timestamp = new Date().toLocaleString();
  
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with email/SMS service
    // Example: SendGrid, Twilio, AWS SNS, etc.
    console.log(`[PRODUCTION] ${type.toUpperCase()} Notification to ${contact}: ${message}`);
  } else {
    // Development: Console log
    console.log('\n' + '='.repeat(60));
    console.log(`📧 NOTIFICATION (${type.toUpperCase()})`);
    console.log('='.repeat(60));
    console.log(`To: ${contact}`);
    console.log(`Time: ${timestamp}`);
    console.log(`Message: ${message}`);
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Notify owner about QR scan
 * @param {string} contact - Owner contact info
 * @param {string} deviceInfo - Device that scanned QR
 * @param {Date} scanTime - When QR was scanned
 */
function notifyQRScan(contact, deviceInfo, scanTime) {
  if (!contact) return; // No contact info provided
  
  const timeStr = scanTime.toLocaleString();
  const message = `Your ICE QR code was scanned from ${deviceInfo} at ${timeStr}`;
  
  notifyOwner(contact, message, 'scan');
}

/**
 * Notify owner about OTP request
 * @param {string} contact - Owner contact info
 * @param {string} deviceInfo - Device that requested OTP
 */
function notifyOTPRequest(contact, deviceInfo) {
  if (!contact) return;
  
  const message = `OTP requested to access sensitive medical information from ${deviceInfo}`;
  
  notifyOwner(contact, message, 'otp_request');
}

/**
 * Send OTP to requester
 * @param {string} contact - Contact info of person requesting OTP
 * @param {string} otpCode - The OTP code
 */
function sendOTP(contact, otpCode) {
  // In development: log to console
  // In production: send via SMS/Email
  
  const timestamp = new Date().toLocaleString();
  
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with SMS/Email service
    console.log(`[PRODUCTION] OTP sent to ${contact}: ${otpCode}`);
  } else {
    // Development: Console log
    console.log('\n' + '='.repeat(60));
    console.log('📱 OTP DELIVERY');
    console.log('='.repeat(60));
    console.log(`To: ${contact}`);
    console.log(`Time: ${timestamp}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Valid for: 5 minutes`);
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Extract device info from request
 * @param {object} req - Express request object
 * @returns {string} Device information string
 */
function getDeviceInfo(req) {
  const userAgent = req.get('user-agent') || 'Unknown Device';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown IP';
  
  // Extract browser/device name from user agent
  let deviceName = 'Unknown Device';
  if (userAgent.includes('Mobile')) {
    deviceName = 'Mobile Device';
  } else if (userAgent.includes('Tablet')) {
    deviceName = 'Tablet';
  } else {
    deviceName = 'Desktop/Web Browser';
  }
  
  return `${deviceName} (${ip})`;
}

module.exports = {
  notifyOwner,
  notifyQRScan,
  notifyOTPRequest,
  sendOTP,
  getDeviceInfo
};
