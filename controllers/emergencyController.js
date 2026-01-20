/**
 * Emergency Controller
 * Handles public emergency information access
 */

const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Get emergency information by unique ID (public access)
 * GET /emergency/:id
 * 
 * Returns HTML page if browser request, JSON if API request
 */
const getEmergencyInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID format (basic UUID check)
    if (!id || id.length < 10) {
      return next(new AppError('Invalid profile ID', 400));
    }
    
    // Get emergency-safe profile data (basic fields only)
    const profile = await Profile.getEmergencyProfile(id);
    
    if (!profile) {
      // If HTML request, serve error page
      if (req.accepts('html')) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Emergency Information Not Found - ICE</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
              .error { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
              h1 { color: #dc3545; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>⚠️ Information Not Found</h1>
              <p>Emergency information not found. Please check the QR code or contact emergency services.</p>
              <p><strong>For emergencies, call 911 immediately.</strong></p>
            </div>
          </body>
          </html>
        `);
      }
      return next(new AppError('Emergency information not found. Please check the QR code or contact emergency services.', 404));
    }
    
    // Log QR scan and notify owner
    const deviceInfo = getDeviceInfo(req);
    const scanTime = new Date();
    
    // Update last scan info
    await Profile.findOneAndUpdate(
      { uniqueId: id },
      {
        lastQrScan: {
          scannedAt: scanTime,
          scannedByDevice: deviceInfo
        }
      }
    );
    
    // Notify owner if contact info exists
    const fullProfile = await Profile.findOne({ uniqueId: id });
    if (fullProfile && fullProfile.ownerNotificationContact) {
      notifyQRScan(fullProfile.ownerNotificationContact, deviceInfo, scanTime);
    }
    
    // Check if profile has sensitive data
    const fullProfile = await Profile.findOne({ uniqueId: id });
    const hasSensitiveData = fullProfile && (
      (fullProfile.allergies && fullProfile.allergies.toLowerCase() !== 'none') ||
      (fullProfile.medicalConditions && fullProfile.medicalConditions.toLowerCase() !== 'none') ||
      (fullProfile.medications && fullProfile.medications.toLowerCase() !== 'none') ||
      fullProfile.organDonor ||
      fullProfile.address ||
      fullProfile.city ||
      fullProfile.state ||
      fullProfile.photo_url ||
      (fullProfile.notes && fullProfile.notes.trim())
    );
    
    // Return only BASIC emergency information (no sensitive data)
    const emergencyData = {
      fullName: profile.fullName,
      age: profile.age || null,
      gender: profile.gender || null,
      bloodGroup: profile.bloodGroup || 'Unknown',
      emergencyContactName: profile.emergencyContactName,
      emergencyContactNumber: profile.emergencyContactNumber,
      // Sensitive fields are NOT included here
      hasSensitiveData: hasSensitiveData // Flag to show OTP button
    };
    
    // If browser request (Accept: text/html), serve HTML page
    if (req.accepts('html')) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="description" content="Emergency medical information display">
          <title>Emergency Information - ICE</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            html { scroll-behavior: smooth; }
            *:focus { outline: 2px solid #4f46e5; outline-offset: 2px; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .info-text { white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; }
            @media (max-width: 640px) {
              .text-5xl { font-size: 2rem; }
              .text-3xl { font-size: 1.5rem; }
              .text-2xl { font-size: 1.25rem; }
            }
          </style>
        </head>
        <body class="bg-gray-50 min-h-screen">
          <div class="bg-red-600 text-white py-3 px-4 text-center">
            <div class="flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-2xl mr-3"></i>
              <h1 class="text-xl md:text-2xl font-bold">EMERGENCY MEDICAL INFORMATION</h1>
            </div>
          </div>
          <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
            <div class="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6 border-l-4 border-indigo-600">
              <div class="text-center">
                <i class="fas fa-user text-4xl text-indigo-600 mb-4"></i>
                <h2 class="text-3xl md:text-5xl font-bold text-gray-900 mb-2">${escapeHtml(emergencyData.fullName || 'Unknown')}</h2>
                <p class="text-gray-600 text-lg">Emergency Medical Profile</p>
              </div>
            </div>
            <div class="grid md:grid-cols-2 gap-6 mb-6">
              <div class="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-6">
                <div class="flex items-center mb-3">
                  <i class="fas fa-tint text-red-600 text-2xl mr-3"></i>
                  <h3 class="text-lg font-semibold text-gray-800">Blood Group</h3>
                </div>
                <p class="text-3xl font-bold text-red-700">${escapeHtml(emergencyData.bloodGroup || 'Unknown')}</p>
              </div>
              <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div class="flex items-center mb-3">
                  <i class="fas fa-info-circle text-blue-600 text-2xl mr-3"></i>
                  <h3 class="text-lg font-semibold text-gray-800">Basic Info</h3>
                </div>
                <div class="space-y-2">
                  <p class="text-gray-700"><span class="font-semibold">Age:</span> ${emergencyData.age ? escapeHtml(String(emergencyData.age)) : 'Not specified'}</p>
                  <p class="text-gray-700"><span class="font-semibold">Gender:</span> ${escapeHtml(emergencyData.gender || 'Not specified')}</p>
                </div>
              </div>
            </div>
            <!-- Sensitive Data Section - OTP Protected (hidden initially) -->
            <div id="sensitiveDataSection" class="hidden">
              <!-- This will be populated after OTP verification via JavaScript -->
            </div>
            
            <!-- OTP Access Section -->
            ${emergencyData.hasSensitiveData ? `
            <div class="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-lg p-6 mb-6">
              <div class="text-center">
                <i class="fas fa-shield-alt text-yellow-600 text-4xl mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Sensitive Medical Information Protected</h3>
                <p class="text-gray-700 mb-4">Additional medical details require OTP verification for privacy protection.</p>
                <button onclick="requestOTP('${id}')" 
                        id="requestOTPBtn"
                        class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105">
                  <i class="fas fa-key mr-2"></i>Request Access to Full Medical Info
                </button>
              </div>
              
              <!-- OTP Input Section (hidden initially) -->
              <div id="otpSection" class="hidden mt-6">
                <div class="bg-white rounded-lg p-4 mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Enter OTP Code:</label>
                  <div class="flex gap-2">
                    <input type="text" 
                           id="otpInput" 
                           maxlength="6" 
                           pattern="[0-9]{6}"
                           class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                           placeholder="000000">
                    <button onclick="verifyOTP('${id}')" 
                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">
                      <i class="fas fa-check mr-2"></i>Verify
                    </button>
                  </div>
                  <p id="otpMessage" class="text-sm mt-2"></p>
                </div>
              </div>
            </div>
            ` : ''}
            <div class="bg-green-50 border-2 border-green-500 rounded-lg shadow-lg p-6 md:p-8">
              <div class="flex items-center mb-4">
                <i class="fas fa-phone-alt text-green-600 text-3xl mr-4"></i>
                <h3 class="text-2xl font-bold text-gray-800">Emergency Contact</h3>
              </div>
              <div class="space-y-4">
                <div class="bg-white rounded-lg p-4 shadow-sm">
                  <p class="text-lg text-gray-700 mb-1"><span class="font-semibold text-gray-900">Name:</span></p>
                  <p class="text-xl text-gray-800">${escapeHtml(emergencyData.emergencyContactName || 'Not specified')}</p>
                </div>
                ${emergencyData.emergencyContactNumber ? `
                <a href="tel:${escapeHtml(emergencyData.emergencyContactNumber.replace(/\D/g, ''))}" 
                   class="inline-block w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg transform transition hover:scale-105 text-lg md:text-xl text-center">
                  <i class="fas fa-phone mr-2"></i>Call ${escapeHtml(emergencyData.emergencyContactNumber)}
                </a>
                ` : '<div class="bg-white rounded-lg p-4 shadow-sm"><p class="text-gray-600">Phone number not available</p></div>'}
              </div>
            </div>
            <div class="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 md:p-6 rounded-lg">
              <div class="flex items-start">
                <i class="fas fa-info-circle text-blue-600 text-xl mr-3 mt-1"></i>
                <div>
                  <p class="text-sm md:text-base text-blue-800 font-semibold mb-1">Important Notice</p>
                  <p class="text-sm md:text-base text-blue-700">
                    This information is provided for emergency medical purposes only. 
                    For life-threatening emergencies, call <strong>911</strong> or your local emergency number immediately.
                  </p>
                </div>
              </div>
            </div>
          </main>
          <footer class="bg-gray-800 text-white mt-12 py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div class="flex items-center justify-center mb-2">
                <i class="fas fa-heartbeat text-red-500 text-xl mr-2"></i>
                <p class="text-gray-300 text-sm">&copy; 2024 ICE – In Case of Emergency</p>
              </div>
              <p class="text-red-400 text-sm font-semibold">
                <i class="fas fa-phone mr-1"></i>For emergencies, call 911 immediately
              </p>
            </div>
          </footer>
          <script>
            // OTP Functions
            async function requestOTP(profileId) {
              const btn = document.getElementById('requestOTPBtn');
              const otpSection = document.getElementById('otpSection');
              const message = document.getElementById('otpMessage');
              
              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Requesting...';
              
              try {
                const apiBase = window.location.origin;
                const response = await fetch(apiBase + '/api/request-otp/' + profileId, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.success) {
                  otpSection.classList.remove('hidden');
                  message.textContent = 'OTP sent! Check console/logs for the code.';
                  message.className = 'text-sm mt-2 text-green-600';
                  btn.classList.add('hidden');
                } else {
                  message.textContent = data.error || 'Failed to request OTP';
                  message.className = 'text-sm mt-2 text-red-600';
                }
              } catch (error) {
                message.textContent = 'Error requesting OTP';
                message.className = 'text-sm mt-2 text-red-600';
              } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key mr-2"></i>Request Access to Full Medical Info';
              }
            }
            
            async function verifyOTP(profileId) {
              const otpInput = document.getElementById('otpInput');
              const otp = otpInput.value.trim();
              const message = document.getElementById('otpMessage');
              const sensitiveSection = document.getElementById('sensitiveDataSection');
              
              if (!otp || otp.length !== 6) {
                message.textContent = 'Please enter a 6-digit OTP';
                message.className = 'text-sm mt-2 text-red-600';
                return;
              }
              
              message.textContent = 'Verifying...';
              message.className = 'text-sm mt-2 text-blue-600';
              
              try {
                const apiBase = window.location.origin;
                const response = await fetch(apiBase + '/api/verify-otp/' + profileId, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ otp })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  // Display sensitive data
                  displaySensitiveData(data.data);
                  document.getElementById('otpSection').classList.add('hidden');
                  message.textContent = '';
                } else {
                  message.textContent = data.error || 'Invalid OTP';
                  message.className = 'text-sm mt-2 text-red-600';
                }
              } catch (error) {
                message.textContent = 'Error verifying OTP';
                message.className = 'text-sm mt-2 text-red-600';
              }
            }
            
            function displaySensitiveData(data) {
              const section = document.getElementById('sensitiveDataSection');
              let html = '';
              
              if (data.allergies && data.allergies.toLowerCase() !== 'none') {
                html += '<div class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-lg p-6 mb-6"><div class="flex items-center mb-3"><i class="fas fa-exclamation-triangle text-yellow-600 text-2xl mr-3"></i><h3 class="text-xl font-bold text-gray-800">Allergies</h3></div><p class="text-lg text-gray-800 info-text">' + escapeHtml(data.allergies) + '</p></div>';
              }
              
              if (data.medicalConditions && data.medicalConditions.toLowerCase() !== 'none') {
                html += '<div class="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-purple-500"><div class="flex items-center mb-3"><i class="fas fa-heartbeat text-purple-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Medical Conditions</h3></div><p class="text-lg text-gray-700 info-text">' + escapeHtml(data.medicalConditions) + '</p></div>';
              }
              
              if (data.medications && data.medications.toLowerCase() !== 'none') {
                html += '<div class="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-green-500"><div class="flex items-center mb-3"><i class="fas fa-pills text-green-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Current Medications</h3></div><p class="text-lg text-gray-700 info-text">' + escapeHtml(data.medications) + '</p></div>';
              }
              
              if (data.organDonor === true || data.organDonor === 'true') {
                html += '<div class="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-lg p-6 mb-6"><div class="flex items-center mb-3"><i class="fas fa-heart text-blue-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Organ Donor Status</h3></div><p class="text-lg text-gray-700 font-semibold">✓ Registered Organ Donor</p></div>';
              }
              
              if (data.address || data.city || data.state) {
                const addressParts = [data.address, data.city, data.state].filter(Boolean);
                if (addressParts.length > 0) {
                  html += '<div class="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-gray-500"><div class="flex items-center mb-3"><i class="fas fa-map-marker-alt text-gray-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Address</h3></div><p class="text-lg text-gray-700">' + escapeHtml(addressParts.join(', ')) + '</p></div>';
                }
              }
              
              if (data.photo_url) {
                html += '<div class="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-indigo-500"><div class="flex items-center mb-3"><i class="fas fa-image text-indigo-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Photo</h3></div><img src="' + escapeHtml(data.photo_url) + '" alt="Profile Photo" class="max-w-xs rounded-lg shadow-md"></div>';
              }
              
              if (data.notes && data.notes.trim()) {
                html += '<div class="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-lg p-6 mb-6"><div class="flex items-center mb-3"><i class="fas fa-sticky-note text-blue-600 text-2xl mr-3"></i><h3 class="text-xl font-semibold text-gray-800">Additional Notes</h3></div><p class="text-lg text-gray-700 info-text">' + escapeHtml(data.notes) + '</p></div>';
              }
              
              section.innerHTML = html;
              section.classList.remove('hidden');
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            function escapeHtml(text) {
              if (!text) return '';
              const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
              return String(text).replace(/[&<>"']/g, m => map[m]);
            }
          </script>
        </body>
        </html>
      `);
    }
    
    // Return JSON for API requests
    res.status(200).json({
      success: true,
      data: emergencyData
    });
  } catch (error) {
    // Handle invalid ObjectId or other errors
    if (error.name === 'CastError') {
      return next(new AppError('Invalid profile ID format', 400));
    }
    next(error);
  }
};

module.exports = {
  getEmergencyInfo
};
