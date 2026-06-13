/**
 * Notification Utility
 * Handles notifications for QR scans and OTP requests
 */

const http = require('http');

/**
 * Get approximate location from scanner's IP address (no user permission needed)
 * Uses ip-api.com free tier — returns city-level accuracy
 */
async function getIPLocation(ip) {
  return new Promise((resolve) => {
    const cleanIp = (ip || '').replace('::ffff:', '').replace('::1', '').trim();

    // Can't geolocate localhost or missing IPs
    if (!cleanIp || cleanIp === '127.0.0.1') {
      return resolve(null);
    }

    http.get(`http://ip-api.com/json/${cleanIp}?fields=status,lat,lon,city,regionName`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'success') {
            resolve({ lat: result.lat, lng: result.lon, city: result.city, region: result.regionName });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Send SMS via Twilio
 * @param {string} phone - Phone number (10 digits)
 * @param {string} message - SMS message text
 */
async function sendSMS(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[SMS] Twilio credentials not set. SMS not sent.');
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (cleanPhone.length !== 10) {
    console.log('[SMS] Invalid phone number:', phone);
    return false;
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({
      body: message,
      from: fromNumber,
      to: '+91' + cleanPhone
    });
    console.log(`[SMS] ✅ Sent to ${cleanPhone} (SID: ${msg.sid})`);
    return true;
  } catch (err) {
    console.log(`[SMS] ❌ Twilio error: ${err.message}`);
    return false;
  }
}

/**
 * Send OTP via SMS to the registered emergency contact phone number
 * @param {string} phone - Phone number
 * @param {string} otpCode - The OTP code
 */
async function sendOTP(phone, otpCode) {
  const message = `ICE Emergency App: Your OTP to access sensitive medical information is ${otpCode}. Valid for 5 minutes. Do not share this OTP.`;

  console.log('\n' + '='.repeat(60));
  console.log('📱 OTP DELIVERY');
  console.log('='.repeat(60));
  console.log(`To: ${phone}`);
  console.log(`OTP Code: ${otpCode}`);
  console.log(`Valid for: 5 minutes`);
  console.log('='.repeat(60) + '\n');

  const sent = await sendSMS(phone, message);
  return sent;
}

/**
 * Notify emergency contact when QR code is scanned
 * Includes approximate IP-based location if available
 */
async function notifyQRScan(contact, deviceInfo, scanTime, patientName, ipLocation) {
  if (!contact) return;
  const timeStr = scanTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const name = patientName ? `for ${patientName}` : '';

  let locationLine = '';
  if (ipLocation) {
    const mapsLink = `https://maps.google.com/?q=${ipLocation.lat},${ipLocation.lng}`;
    const place = [ipLocation.city, ipLocation.region].filter(Boolean).join(', ');
    locationLine = ` Approx. location: ${mapsLink}${place ? ` (${place})` : ''}.`;
  }

  const message = `ICE Alert: QR code ${name} scanned at ${timeStr} by ${deviceInfo}.${locationLine} Respond immediately if this is an emergency.`;
  console.log(`[SCAN] QR scanned. Notifying emergency contact: ${contact}`);
  await sendSMS(contact, message);
}

/**
 * Notify emergency contact with scanner's GPS location
 */
async function notifyScanLocation(contact, patientName, lat, lng) {
  if (!contact || !lat || !lng) return;
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const name = patientName ? `for ${patientName}` : '';
  const message = `ICE Alert: Emergency location ${name} — the person who scanned the QR is here: ${mapsLink}`;
  console.log(`[LOCATION] Notifying emergency contact ${contact} with location: ${lat},${lng}`);
  await sendSMS(contact, message);
}

/**
 * Notify emergency contact that someone is accessing the profile
 */
async function notifyOTPRequest(contact, deviceInfo) {
  if (!contact) return;
  const message = `ICE Alert: Someone is trying to access the full medical info of the person linked to your emergency contact. Device: ${deviceInfo}`;
  console.log(`[OTP ALERT] Notifying emergency contact: ${contact}`);
  await sendSMS(contact, message);
}

/**
 * Send approve/reject access request SMS to an emergency contact
 * Called on QR scan when the profile has sensitive data
 */
async function notifyApprovalRequest(phone, patientName, bloodGroup, decideUrl, scanTime, ipLocation) {
  if (!phone) return;
  const bgText = bloodGroup && bloodGroup !== 'Unknown' ? ` Blood: ${bloodGroup}.` : '';
  const message = `ICE ALERT: Someone needs full medical info for ${patientName}.${bgText} Tap to approve or reject (10 min): ${decideUrl}`;
  console.log(`[APPROVAL] Sending approve/reject SMS to ${phone}`);
  await sendSMS(phone, message);
}

/**
 * Extract device info from request
 */
function getDeviceInfo(req) {
  const userAgent = req.get('user-agent') || 'Unknown Device';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown IP';

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
  sendSMS,
  sendOTP,
  getIPLocation,
  notifyQRScan,
  notifyScanLocation,
  notifyOTPRequest,
  notifyApprovalRequest,
  getDeviceInfo
};
