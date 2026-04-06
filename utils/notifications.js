/**
 * Notification Utility
 * Handles notifications for QR scans and OTP requests
 */

const https = require('https');

/**
 * Send SMS via Fast2SMS
 * @param {string} phone - Phone number (10 digits)
 * @param {string} message - SMS message text
 */
async function sendSMS(phone, message) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      console.log('[SMS] FAST2SMS_API_KEY not set. OTP not sent via SMS.');
      return resolve(false);
    }

    // Clean phone number — keep only digits, remove country code if present
    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);

    if (cleanPhone.length !== 10) {
      console.log('[SMS] Invalid phone number:', phone);
      return resolve(false);
    }

    const payload = JSON.stringify({
      route: 'q',
      message: message,
      language: 'english',
      flash: 0,
      numbers: cleanPhone
    });

    const options = {
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.return === true) {
            console.log(`[SMS] OTP sent successfully to ${cleanPhone}`);
            resolve(true);
          } else {
            console.log('[SMS] Fast2SMS error:', result.message || data);
            resolve(false);
          }
        } catch (e) {
          console.log('[SMS] Failed to parse Fast2SMS response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('[SMS] Fast2SMS request error:', err.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
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
 * Notify owner about QR scan
 */
function notifyQRScan(contact, deviceInfo, scanTime) {
  if (!contact) return;
  const timeStr = scanTime.toLocaleString();
  console.log(`[SCAN] QR scanned by ${deviceInfo} at ${timeStr}. Owner: ${contact}`);
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
  notifyQRScan,
  notifyOTPRequest,
  getDeviceInfo
};
