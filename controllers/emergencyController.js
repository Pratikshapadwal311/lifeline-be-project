/**
 * Emergency Controller
 * Handles public emergency information access
 */

const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');
const { generateFirstAidInstructions, getGeneralSteps } = require('../utils/firstAidRules');

function getDeviceInfo(req) {
  return req.headers['user-agent'] || 'Unknown device';
}

function notifyQRScan(contact, deviceInfo, scanTime) {
  // Notification not implemented — placeholder
}

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
          <!-- Language Switcher -->
          <div class="bg-gray-800 text-white px-4 py-2">
            <div class="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs text-gray-400">🌐 Select Language:</span>
              <div class="flex flex-wrap gap-1" id="langButtons"></div>
            </div>
          </div>
          <div class="bg-red-600 text-white py-3 px-4 text-center">
            <div class="flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-2xl mr-3"></i>
              <h1 class="text-xl md:text-2xl font-bold" id="txt_emergencyHeader">EMERGENCY MEDICAL INFORMATION</h1>
            </div>
          </div>
          <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
            <div class="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6 border-l-4 border-indigo-600">
              <div class="text-center">
                <i class="fas fa-user text-4xl text-indigo-600 mb-4"></i>
                <h2 class="text-3xl md:text-5xl font-bold text-gray-900 mb-2">${escapeHtml(emergencyData.fullName || 'Unknown')}</h2>
                <p class="text-gray-600 text-lg" id="txt_emergencyProfile">Emergency Medical Profile</p>
              </div>
            </div>
            <div class="grid md:grid-cols-2 gap-6 mb-6">
              <div class="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-6">
                <div class="flex items-center mb-3">
                  <i class="fas fa-tint text-red-600 text-2xl mr-3"></i>
                  <h3 class="text-lg font-semibold text-gray-800" id="txt_bloodGroup">Blood Group</h3>
                </div>
                <p class="text-3xl font-bold text-red-700">${escapeHtml(emergencyData.bloodGroup || 'Unknown')}</p>
              </div>
              <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div class="flex items-center mb-3">
                  <i class="fas fa-info-circle text-blue-600 text-2xl mr-3"></i>
                  <h3 class="text-lg font-semibold text-gray-800" id="txt_basicInfo">Basic Info</h3>
                </div>
                <div class="space-y-2">
                  <p class="text-gray-700"><span class="font-semibold">Age:</span> ${emergencyData.age ? escapeHtml(String(emergencyData.age)) : 'Not specified'}</p>
                  <p class="text-gray-700"><span class="font-semibold">Gender:</span> ${escapeHtml(emergencyData.gender || 'Not specified')}</p>
                </div>
              </div>
            </div>
            <!-- First Aid Instructions Section -->
            <div class="bg-green-600 rounded-lg shadow-lg p-6 mb-6 text-center">
              <i class="fas fa-first-aid text-white text-4xl mb-3"></i>
              <h3 class="text-xl font-bold text-white mb-2" id="txt_firstAidTitle">Need First Aid Instructions?</h3>
              <p class="text-green-100 mb-4" id="txt_firstAidDesc">Get step-by-step guidance based on this patient's medical conditions</p>
              <button onclick="loadFirstAid('${id}')"
                      id="firstAidBtn"
                      class="bg-white text-green-600 font-bold py-3 px-8 rounded-lg shadow hover:bg-green-50 text-lg">
                <i class="fas fa-heartbeat mr-2"></i><span id="txt_showFirstAid">Show First Aid Instructions</span>
              </button>
            </div>

            <!-- First Aid Content (hidden initially) -->
            <div id="firstAidSection" class="hidden mb-6"></div>

            <!-- Sensitive Data Section - OTP Protected (hidden initially) -->
            <div id="sensitiveDataSection" class="hidden">
              <!-- This will be populated after OTP verification via JavaScript -->
            </div>

            <!-- Alert Nearby First-Aiders Section -->
            <div class="bg-orange-50 border-2 border-orange-400 rounded-lg shadow-lg p-6 mb-6">
              <div class="text-center">
                <i class="fas fa-people-carry text-orange-500 text-4xl mb-3"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Alert Nearby First-Aiders</h3>
                <p class="text-gray-600 mb-4">Notify trained volunteers within 500m about this emergency</p>
                <div id="alertStatus" class="hidden mb-4 p-3 rounded-lg text-sm font-medium"></div>
                <button id="alertBtn"
                        onclick="alertNearbyFirstAiders('${id}', '${escapeHtml(emergencyData.fullName)}', '${escapeHtml(emergencyData.bloodGroup)}')"
                        class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg text-lg">
                  <i class="fas fa-map-marker-alt mr-2"></i>Get My Location &amp; Alert First-Aiders
                </button>
                <p class="text-xs text-gray-400 mt-2">Your location is only used to find volunteers nearby</p>
              </div>
            </div>

            <!-- OTP Access Section -->
            ${emergencyData.hasSensitiveData ? `
            <div class="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-lg p-6 mb-6">
              <div class="text-center">
                <i class="fas fa-shield-alt text-yellow-600 text-4xl mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2" id="txt_sensitiveTitle">Sensitive Medical Information Protected</h3>
                <p class="text-gray-700 mb-4" id="txt_sensitiveDesc">Enter your phone number to receive an OTP and access full medical information.</p>
              </div>

              <!-- Phone Number Input -->
              <div id="phoneSection" class="bg-white rounded-lg p-4 mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-phone mr-1 text-yellow-600"></i><span id="txt_yourPhone">Your Phone Number:</span>
                </label>
                <div class="flex flex-col gap-2">
                  <input type="tel"
                         id="phoneInput"
                         maxlength="13"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                         placeholder="Enter your phone number">
                  <button onclick="requestOTP('${id}')"
                          id="requestOTPBtn"
                          class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg">
                    <i class="fas fa-key mr-2"></i><span id="txt_sendOtp">Send OTP</span>
                  </button>
                </div>
                <p id="phoneMessage" class="text-sm mt-2"></p>
              </div>

              <!-- OTP Input Section (hidden initially) -->
              <div id="otpSection" class="hidden mt-4">
                <div class="bg-white rounded-lg p-4 mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-lock mr-1 text-green-600"></i><span id="txt_enterOtp">Enter OTP sent to your phone:</span>
                  </label>
                  <div class="flex flex-col gap-2">
                    <input type="text"
                           id="otpInput"
                           maxlength="6"
                           pattern="[0-9]{6}"
                           inputmode="numeric"
                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-green-500 focus:border-green-500"
                           placeholder="000000">
                    <button onclick="verifyOTP('${id}')"
                            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">
                      <i class="fas fa-check mr-2"></i><span id="txt_verifyOtp">Verify OTP</span>
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
                <h3 class="text-2xl font-bold text-gray-800" id="txt_emergencyContact">Emergency Contact</h3>
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
                  <p class="text-sm md:text-base text-blue-800 font-semibold mb-1" id="txt_importantNotice">Important Notice</p>
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
              const phoneInput = document.getElementById('phoneInput');
              const phoneMessage = document.getElementById('phoneMessage');
              const otpSection = document.getElementById('otpSection');

              const phone = phoneInput.value.trim();
              if (!phone) {
                phoneMessage.textContent = 'Please enter the emergency contact phone number.';
                phoneMessage.className = 'text-sm mt-2 text-red-600';
                return;
              }

              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending OTP...';
              phoneMessage.textContent = '';

              try {
                const apiBase = window.location.origin;
                const response = await fetch(apiBase + '/api/request-otp/' + profileId, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone })
                });

                const data = await response.json();

                if (data.success) {
                  otpSection.classList.remove('hidden');
                  phoneMessage.textContent = data.message;
                  phoneMessage.className = 'text-sm mt-2 text-green-600';
                  btn.classList.add('hidden');
                  phoneInput.disabled = true;
                } else {
                  phoneMessage.textContent = data.error || 'Failed to send OTP. Check the phone number.';
                  phoneMessage.className = 'text-sm mt-2 text-red-600';
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-key mr-2"></i>Send OTP';
                }
              } catch (error) {
                phoneMessage.textContent = 'Error sending OTP. Please try again.';
                phoneMessage.className = 'text-sm mt-2 text-red-600';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key mr-2"></i>Send OTP';
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
              let html = '<h3 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-unlock text-green-600 mr-2"></i>Sensitive Medical Information</h3>';

              // Insurance
              if (data.insuranceProvider || data.insurancePolicyNumber) {
                html += '<div class="bg-purple-50 border-l-4 border-purple-500 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-shield-alt text-purple-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Insurance Details</h4></div>';
                if (data.insuranceProvider) html += '<p class="text-gray-700 mb-1"><span class="font-medium">Provider:</span> ' + escapeHtml(data.insuranceProvider) + '</p>';
                if (data.insurancePolicyNumber) html += '<p class="text-gray-700"><span class="font-medium">Policy No:</span> ' + escapeHtml(data.insurancePolicyNumber) + '</p>';
                html += '</div>';
              }

              // Government ID
              if (data.governmentIdNumber) {
                html += '<div class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-id-card text-yellow-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Government ID</h4></div>';
                html += '<p class="text-gray-700 text-lg font-mono">' + escapeHtml(data.governmentIdNumber) + '</p>';
                html += '</div>';
              }

              // Dietary Restrictions
              if (data.dietaryRestrictions) {
                html += '<div class="bg-orange-50 border-l-4 border-orange-500 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-utensils text-orange-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Dietary Restrictions</h4></div>';
                html += '<p class="text-gray-700">' + escapeHtml(data.dietaryRestrictions) + '</p>';
                html += '</div>';
              }

              // Organ Donor
              if (data.organDonor === true || data.organDonor === 'true') {
                html += '<div class="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-heart text-blue-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Organ Donor</h4></div>';
                html += '<p class="text-gray-700 font-semibold text-green-600">✓ Registered Organ Donor</p>';
                html += '</div>';
              }

              // Address
              if (data.address || data.city || data.state) {
                const addressParts = [data.address, data.city, data.state].filter(Boolean);
                html += '<div class="bg-gray-50 border-l-4 border-gray-400 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-map-marker-alt text-gray-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Home Address</h4></div>';
                html += '<p class="text-gray-700">' + escapeHtml(addressParts.join(', ')) + '</p>';
                html += '</div>';
              }

              // Notes
              if (data.notes && data.notes.trim()) {
                html += '<div class="bg-gray-50 border-l-4 border-gray-400 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-2"><i class="fas fa-sticky-note text-gray-600 text-xl mr-2"></i><h4 class="font-semibold text-gray-800">Additional Notes</h4></div>';
                html += '<p class="text-gray-700 info-text">' + escapeHtml(data.notes) + '</p>';
                html += '</div>';
              }

              section.innerHTML = html;
              section.classList.remove('hidden');
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            async function loadFirstAid(profileId) {
              const btn = document.getElementById('firstAidBtn');
              const section = document.getElementById('firstAidSection');

              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';

              try {
                const response = await fetch(window.location.origin + '/emergency/' + profileId + '/firstaid');
                const data = await response.json();

                if (!data.success) throw new Error('Failed to load');

                const { patientName, generalSteps, conditions } = data.data;
                let html = '';

                // General steps always shown first
                html += '<div class="bg-blue-50 border-l-4 border-blue-600 rounded-lg shadow p-5 mb-4">';
                html += '<div class="flex items-center mb-3"><i class="fas fa-list-check text-blue-600 text-xl mr-2"></i><h3 class="text-lg font-bold text-gray-800">General Emergency Steps</h3></div>';
                html += '<ol class="list-decimal list-inside space-y-2">';
                generalSteps.forEach(step => {
                  html += '<li class="text-gray-700">' + escapeHtml(step) + '</li>';
                });
                html += '</ol></div>';

                // Condition specific instructions
                if (conditions.length > 0) {
                  html += '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">';
                  html += '<h3 class="text-lg font-bold text-red-700 mb-3"><i class="fas fa-exclamation-triangle mr-2"></i>Patient-Specific Warnings</h3>';
                  conditions.forEach(condition => {
                    html += '<div class="bg-white rounded-lg border-l-4 border-red-500 p-4 mb-3">';
                    html += '<p class="font-bold text-red-700 text-lg mb-2">' + condition.icon + ' ' + escapeHtml(condition.warning) + '</p>';
                    html += '<ul class="space-y-1">';
                    condition.instructions.forEach(inst => {
                      const isDanger = inst.startsWith('DO NOT');
                      html += '<li class="flex items-start text-gray-700">';
                      html += '<span class="mr-2 mt-1">' + (isDanger ? '🚫' : '✅') + '</span>';
                      html += '<span class="' + (isDanger ? 'font-semibold text-red-600' : '') + '">' + escapeHtml(inst) + '</span>';
                      html += '</li>';
                    });
                    html += '</ul></div>';
                  });
                  html += '</div>';
                } else {
                  html += '<div class="bg-gray-50 border rounded-lg p-4 mb-4 text-center text-gray-500">No specific conditions detected. Follow general steps above.</div>';
                }

                section.innerHTML = html;
                section.classList.remove('hidden');
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });

                btn.innerHTML = '<i class="fas fa-check mr-2"></i>First Aid Instructions Loaded';
                btn.classList.remove('bg-white', 'text-green-600');
                btn.classList.add('bg-green-100', 'text-green-800');

              } catch (err) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-heartbeat mr-2"></i>Show First Aid Instructions';
              }
            }

            function escapeHtml(text) {
              if (!text) return '';
              const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
              return String(text).replace(/[&<>"']/g, m => map[m]);
            }

            // ── Nearby First-Aider Alert ──
            async function alertNearbyFirstAiders(profileId, patientName, bloodGroup) {
              const btn = document.getElementById('alertBtn');
              const status = document.getElementById('alertStatus');

              if (!navigator.geolocation) {
                status.textContent = 'Location not supported on this device';
                status.className = 'mb-4 p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
                status.classList.remove('hidden');
                return;
              }

              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Getting your location...';
              status.classList.add('hidden');

              // HTTPS check — geolocation is blocked on http:// by all modern mobile browsers
              if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                status.innerHTML = '<strong>HTTPS required.</strong> Location access only works over a secure connection. Please open this page using your Cloudflare (https://) link instead of a local IP address.';
                status.className = 'mb-4 p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
                status.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i>Get My Location &amp; Alert First-Aiders';
                return;
              }

              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Alerting first-aiders...';
                  try {
                    const response = await fetch(window.location.origin + '/api/alert/nearby', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        profileId,
                        patientName,
                        bloodGroup
                      })
                    });
                    const data = await response.json();
                    if (data.success) {
                      const alerted = data.data.alerted;
                      status.textContent = data.data.message;
                      status.className = 'mb-4 p-3 rounded-lg text-sm font-medium ' +
                        (alerted > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700');
                      status.classList.remove('hidden');
                      btn.innerHTML = '<i class="fas fa-check mr-2"></i>Alert Sent (' + alerted + ' notified)';
                    } else {
                      throw new Error(data.error || 'Failed');
                    }
                  } catch (err) {
                    status.textContent = 'Failed to send alert. Please try again.';
                    status.className = 'mb-4 p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
                    status.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i>Get My Location &amp; Alert First-Aiders';
                  }
                },
                (err) => {
                  let msg = 'Could not get location. ';
                  if (err.code === 1) {
                    msg += 'Location permission was denied. Open browser Settings → Site Settings → Location → Allow for this site.';
                  } else if (err.code === 2) {
                    msg += 'Location unavailable. Make sure GPS is enabled on your phone and try again.';
                  } else if (err.code === 3) {
                    msg += 'Location request timed out. Move to an open area and try again.';
                  }
                  status.textContent = msg;
                  status.className = 'mb-4 p-3 rounded-lg text-sm font-medium bg-red-100 text-red-700';
                  status.classList.remove('hidden');
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i>Get My Location &amp; Alert First-Aiders';
                },
                { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
              );
            }

            // ── Translation System ──
            const TRANSLATIONS = {
              en: { name:'English', flag:'🇬🇧', emergencyHeader:'EMERGENCY MEDICAL INFORMATION', emergencyProfile:'Emergency Medical Profile', bloodGroup:'Blood Group', basicInfo:'Basic Info', emergencyContact:'Emergency Contact', sensitiveTitle:'Sensitive Medical Information Protected', sensitiveDesc:'Enter your phone number to receive an OTP and access full medical information.', yourPhone:'Your Phone Number:', sendOtp:'Send OTP', enterOtp:'Enter OTP sent to your phone:', verifyOtp:'Verify OTP', firstAidTitle:'Need First Aid Instructions?', firstAidDesc:"Get step-by-step guidance based on this patient's medical conditions", showFirstAid:'Show First Aid Instructions', firstAidLoaded:'First Aid Instructions Loaded', importantNotice:'Important Notice', sendingOtp:'Sending OTP...', verifying:'Verifying...' },
              hi: { name:'हिंदी', flag:'🇮🇳', emergencyHeader:'आपातकालीन चिकित्सा जानकारी', emergencyProfile:'आपातकालीन चिकित्सा प्रोफ़ाइल', bloodGroup:'रक्त समूह', basicInfo:'बुनियादी जानकारी', emergencyContact:'आपातकालीन संपर्क', sensitiveTitle:'संवेदनशील चिकित्सा जानकारी सुरक्षित है', sensitiveDesc:'OTP प्राप्त करने के लिए अपना फ़ोन नंबर दर्ज करें।', yourPhone:'आपका फ़ोन नंबर:', sendOtp:'OTP भेजें', enterOtp:'OTP दर्ज करें:', verifyOtp:'OTP सत्यापित करें', firstAidTitle:'प्राथमिक चिकित्सा निर्देश चाहिए?', firstAidDesc:'मरीज़ की स्थितियों के आधार पर मार्गदर्शन पाएं', showFirstAid:'प्राथमिक चिकित्सा दिखाएं', firstAidLoaded:'प्राथमिक चिकित्सा लोड हो गई', importantNotice:'महत्वपूर्ण सूचना', sendingOtp:'OTP भेजा जा रहा है...', verifying:'सत्यापित हो रहा है...' },
              mr: { name:'मराठी', flag:'🇮🇳', emergencyHeader:'आपत्कालीन वैद्यकीय माहिती', emergencyProfile:'आपत्कालीन वैद्यकीय प्रोफाइल', bloodGroup:'रक्त गट', basicInfo:'मूलभूत माहिती', emergencyContact:'आपत्कालीन संपर्क', sensitiveTitle:'संवेदनशील वैद्यकीय माहिती संरक्षित आहे', sensitiveDesc:'OTP मिळवण्यासाठी आपला फोन नंबर टाका.', yourPhone:'आपला फोन नंबर:', sendOtp:'OTP पाठवा', enterOtp:'OTP टाका:', verifyOtp:'OTP सत्यापित करा', firstAidTitle:'प्रथमोपचार सूचना हव्या आहेत?', firstAidDesc:'रुग्णाच्या स्थितींवर आधारित मार्गदर्शन मिळवा', showFirstAid:'प्रथमोपचार सूचना दाखवा', firstAidLoaded:'प्रथमोपचार सूचना लोड झाल्या', importantNotice:'महत्त्वाची सूचना', sendingOtp:'OTP पाठवला जात आहे...', verifying:'सत्यापित होत आहे...' },
              ta: { name:'தமிழ்', flag:'🇮🇳', emergencyHeader:'அவசர மருத்துவ தகவல்', emergencyProfile:'அவசர மருத்துவ சுயவிவரம்', bloodGroup:'இரத்த வகை', basicInfo:'அடிப்படை தகவல்', emergencyContact:'அவசர தொடர்பு', sensitiveTitle:'முக்கிய மருத்துவ தகவல் பாதுகாக்கப்பட்டுள்ளது', sensitiveDesc:'OTP பெற உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்.', yourPhone:'உங்கள் தொலைபேசி எண்:', sendOtp:'OTP அனுப்பு', enterOtp:'OTP உள்ளிடவும்:', verifyOtp:'OTP சரிபார்க்கவும்', firstAidTitle:'முதலுதவி வழிமுறைகள் வேண்டுமா?', firstAidDesc:'நோயாளியின் நிலைமைகளின் அடிப்படையில் வழிகாட்டுதல் பெறுங்கள்', showFirstAid:'முதலுதவி வழிமுறைகளைக் காட்டு', firstAidLoaded:'முதலுதவி வழிமுறைகள் ஏற்றப்பட்டன', importantNotice:'முக்கியமான அறிவிப்பு', sendingOtp:'OTP அனுப்பப்படுகிறது...', verifying:'சரிபார்க்கப்படுகிறது...' },
              kn: { name:'ಕನ್ನಡ', flag:'🇮🇳', emergencyHeader:'ತುರ್ತು ವೈದ್ಯಕೀಯ ಮಾಹಿತಿ', emergencyProfile:'ತುರ್ತು ವೈದ್ಯಕೀಯ ಪ್ರೊಫೈಲ್', bloodGroup:'ರಕ್ತದ ಗುಂಪು', basicInfo:'ಮೂಲ ಮಾಹಿತಿ', emergencyContact:'ತುರ್ತು ಸಂಪರ್ಕ', sensitiveTitle:'ಸಂವೇದನಾಶೀಲ ವೈದ್ಯಕೀಯ ಮಾಹಿತಿ ರಕ್ಷಿಸಲಾಗಿದೆ', sensitiveDesc:'OTP ಪಡೆಯಲು ನಿಮ್ಮ ಫೋನ್ ನಂಬರ್ ನಮೂದಿಸಿ.', yourPhone:'ನಿಮ್ಮ ಫೋನ್ ನಂಬರ್:', sendOtp:'OTP ಕಳುಹಿಸಿ', enterOtp:'OTP ನಮೂದಿಸಿ:', verifyOtp:'OTP ಪರಿಶೀಲಿಸಿ', firstAidTitle:'ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ಸೂಚನೆಗಳು ಬೇಕೇ?', firstAidDesc:'ರೋಗಿಯ ಪರಿಸ್ಥಿತಿಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯಿರಿ', showFirstAid:'ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ಸೂಚನೆಗಳನ್ನು ತೋರಿಸಿ', firstAidLoaded:'ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ಸೂಚನೆಗಳು ಲೋಡ್ ಆಗಿವೆ', importantNotice:'ಮುಖ್ಯ ಸೂಚನೆ', sendingOtp:'OTP ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...', verifying:'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' },
              te: { name:'తెలుగు', flag:'🇮🇳', emergencyHeader:'అత్యవసర వైద్య సమాచారం', emergencyProfile:'అత్యవసర వైద్య ప్రొఫైల్', bloodGroup:'రక్త సమూహం', basicInfo:'ప్రాథమిక సమాచారం', emergencyContact:'అత్యవసర సంప్రదింపు', sensitiveTitle:'సంవేదనశీల వైద్య సమాచారం రక్షించబడింది', sensitiveDesc:'OTP పొందడానికి మీ ఫోన్ నంబర్ నమోదు చేయండి.', yourPhone:'మీ ఫోన్ నంబర్:', sendOtp:'OTP పంపండి', enterOtp:'OTP నమోదు చేయండి:', verifyOtp:'OTP ధృవీకరించండి', firstAidTitle:'ప్రథమ చికిత్స సూచనలు కావాలా?', firstAidDesc:'రోగి పరిస్థితుల ఆధారంగా మార్గదర్శకత్వం పొందండి', showFirstAid:'ప్రథమ చికిత్స సూచనలు చూపించు', firstAidLoaded:'ప్రథమ చికిత్స సూచనలు లోడ్ అయ్యాయి', importantNotice:'ముఖ్యమైన నోటీసు', sendingOtp:'OTP పంపబడుతోంది...', verifying:'ధృవీకరిస్తోంది...' },
              sa: { name:'संस्कृत', flag:'🇮🇳', emergencyHeader:'आपत्कालीन चिकित्सा सूचना', emergencyProfile:'आपत्कालीन चिकित्सा विवरण', bloodGroup:'रक्तवर्गः', basicInfo:'मूलभूत सूचना', emergencyContact:'आपत्कालीन सम्पर्कः', sensitiveTitle:'संवेदनशील चिकित्सा सूचना सुरक्षिता', sensitiveDesc:'OTP प्राप्तुं स्वदूरभाषसंख्यां प्रविशतु.', yourPhone:'भवतः दूरभाषसंख्या:', sendOtp:'OTP प्रेषयतु', enterOtp:'OTP प्रविशतु:', verifyOtp:'OTP सत्यापयतु', firstAidTitle:'प्राथमिक चिकित्सा निर्देशाः आवश्यकाः किम्?', firstAidDesc:'रोगिणः स्थितिभिः आधारितं मार्गदर्शनं प्राप्नुतु', showFirstAid:'प्राथमिक चिकित्सा दर्शयतु', firstAidLoaded:'प्राथमिक चिकित्सा निर्देशाः लोडिताः', importantNotice:'महत्त्वपूर्णा सूचना', sendingOtp:'OTP प्रेष्यते...', verifying:'सत्यापयति...' }
            };

            let currentLang = localStorage.getItem('ice_lang') || 'en';

            function applyTranslation(lang) {
              const T = TRANSLATIONS[lang] || TRANSLATIONS['en'];
              currentLang = lang;
              localStorage.setItem('ice_lang', lang);
              const ids = ['emergencyHeader','emergencyProfile','bloodGroup','basicInfo','emergencyContact','sensitiveTitle','sensitiveDesc','yourPhone','sendOtp','enterOtp','verifyOtp','firstAidTitle','firstAidDesc','showFirstAid','importantNotice'];
              ids.forEach(id => {
                const el = document.getElementById('txt_' + id);
                if (el && T[id]) el.textContent = T[id];
              });
              document.querySelectorAll('.lang-btn').forEach(btn => {
                const active = btn.dataset.lang === lang;
                btn.className = 'lang-btn px-2 py-1 rounded text-xs font-medium ' + (active ? 'bg-white text-gray-800 font-bold' : 'bg-gray-600 text-white');
              });
            }

            // Build language buttons
            const langContainer = document.getElementById('langButtons');
            if (langContainer) {
              Object.entries(TRANSLATIONS).forEach(([code, T]) => {
                const btn = document.createElement('button');
                btn.className = 'lang-btn px-2 py-1 rounded text-xs font-medium bg-gray-600 text-white';
                btn.dataset.lang = code;
                btn.textContent = T.flag + ' ' + T.name;
                btn.onclick = () => applyTranslation(code);
                langContainer.appendChild(btn);
              });
            }

            // Apply saved language on load
            applyTranslation(currentLang);
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

/**
 * Get first aid instructions for a profile
 * GET /emergency/:id/firstaid
 */
const getFirstAid = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id.length < 10) {
      return next(new AppError('Invalid profile ID', 400));
    }

    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    const conditions = generateFirstAidInstructions(profile);
    const generalSteps = getGeneralSteps();

    res.status(200).json({
      success: true,
      data: {
        patientName: profile.fullName,
        generalSteps,
        conditions
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmergencyInfo,
  getFirstAid
};
