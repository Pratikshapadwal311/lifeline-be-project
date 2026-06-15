/**
 * Emergency Controller
 * Handles public emergency information access
 */

const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');
const { generateFirstAidInstructions, getGeneralSteps } = require('../utils/firstAidRules');
const crypto = require('crypto');
const { notifyQRScan, notifyScanLocation, getIPLocation, getDeviceInfo, notifyApprovalRequest } = require('../utils/notifications');

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
    
    // Log QR scan
    const deviceInfo = getDeviceInfo(req);
    const scanTime = new Date();

    await Profile.findOneAndUpdate(
      { uniqueId: id },
      { lastQrScan: { scannedAt: scanTime, scannedByDevice: deviceInfo } }
    );

    // Fetch full profile for contacts
    const fullProfile = await Profile.findOne({ uniqueId: id });

    const allContacts = [
      fullProfile?.emergencyContactNumber,
      ...(fullProfile?.additionalEmergencyContacts || []).map(c => c.phone)
    ].filter(Boolean);

    // Notify all contacts that QR was scanned (plain alert — no sensitive info)
    const scannerIP = req.ip || req.connection?.remoteAddress;
    const ipLocation = await getIPLocation(scannerIP);
    if (allContacts.length > 0) {
      allContacts.forEach(phone => notifyQRScan(phone, deviceInfo, scanTime, fullProfile.fullName, ipLocation));
    }

    // Return only BASIC emergency information (no sensitive data)
    const emergencyData = {
      fullName: profile.fullName,
      age: profile.age || null,
      gender: profile.gender || null,
      bloodGroup: profile.bloodGroup || 'Unknown',
      emergencyContactName: profile.emergencyContactName,
      emergencyContactNumber: profile.emergencyContactNumber,
      additionalEmergencyContacts: profile.additionalEmergencyContacts || [],
      chronicDiseases: fullProfile?.chronicDiseases || []
    };
    
    // If browser request (Accept: text/html), serve HTML page
    if (req.accepts('html')) {
      const totalContacts = 1 + emergencyData.additionalEmergencyContacts.length;
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Emergency Information - ICE</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            html { scroll-behavior: smooth; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #CAF0F8; }
            .info-text { white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; }
            .bg-navy   { background-color: #03045E; }
            .bg-blue   { background-color: #0077B6; }
            .bg-cyan   { background-color: #00B4D8; }
            .bg-lcyan  { background-color: #90E0EF; }
            .bg-xlcyan { background-color: #CAF0F8; }
            .text-navy  { color: #03045E; }
            .text-blue  { color: #0077B6; }
            .text-cyan  { color: #00B4D8; }
            .text-lcyan { color: #90E0EF; }
            .border-lcyan { border-color: #90E0EF; }
            .border-cyan  { border-color: #00B4D8; }
            .btn-navy { background-color: #03045E; color: white; transition: background-color .2s; }
            .btn-navy:hover { background-color: #020339; }
            .btn-blue { background-color: #0077B6; color: white; transition: background-color .2s; }
            .btn-blue:hover { background-color: #005f92; }
            @keyframes call-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(0,119,182,0.5); }
              60% { box-shadow: 0 0 0 14px rgba(0,119,182,0); }
            }
            .call-pulse { animation: call-pulse 1.8s ease-in-out infinite; }
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .fade-in { animation: fade-in 0.4s ease forwards; }
            #langSelect option { background-color: #03045E; }
          </style>
          <script src="/js/translations.js"></script>
        </head>
        <body class="min-h-screen">

          <!-- Header -->
          <div class="bg-navy text-white py-3 px-4">
            <div class="flex items-center justify-between max-w-2xl mx-auto">
              <div class="flex items-center gap-3 flex-1 justify-center">
                <i class="fas fa-heartbeat text-2xl text-lcyan"></i>
                <h1 class="text-xl md:text-2xl font-bold tracking-wide" data-i18n="emergencyHeader">EMERGENCY MEDICAL INFORMATION</h1>
              </div>
              <select id="langSelect" onchange="changeLang(this.value)"
                style="background:#03045E;color:#90E0EF;border:1px solid #90E0EF;border-radius:6px;padding:4px 6px;font-size:12px;cursor:pointer;outline:none;flex-shrink:0;margin-left:8px">
              </select>
            </div>
          </div>

          <!-- 112 Emergency Call Button -->
          <div class="bg-white px-4 py-3 text-center border-b border-lcyan">
            <a href="tel:112"
               class="inline-flex items-center justify-center gap-3 bg-cyan hover:bg-blue text-white font-bold py-3 px-8 rounded-xl shadow-lg text-lg transition-colors w-full max-w-sm mx-auto">
              <i class="fas fa-phone-alt text-2xl"></i>
              <span data-i18n="callEmergency">Call 112 — Emergency Services</span>
            </a>
            <p class="text-xs text-blue mt-1" data-i18n="callEmergencyDesc">Tap to call ambulance immediately</p>
          </div>

          <!-- Notified banner -->
          <div class="bg-cyan text-white px-4 py-2 text-center text-sm font-medium fade-in">
            <i class="fas fa-bell mr-2"></i><span data-i18n="contactsNotified" data-i18n-n="${totalContacts}">All ${totalContacts} emergency contact${totalContacts > 1 ? 's' : ''} notified of this scan</span>
            <i class="fas fa-check-circle ml-2"></i>
          </div>

          <!-- Scan time -->
          <div class="bg-lcyan border-b border-cyan px-4 py-1 text-center">
            <p class="text-xs text-blue"><i class="fas fa-clock mr-1"></i><span data-i18n="scannedAt">Scanned at:</span> <span id="scanTime"></span></p>
          </div>

          <div id="locationBanner" class="hidden px-4 py-2 text-center text-sm font-medium fade-in"></div>

          <main class="max-w-2xl mx-auto px-4 py-6 space-y-5">

            <!-- ① Patient Name -->
            <div class="bg-white rounded-xl shadow-sm border border-lcyan p-6 text-center fade-in">
              <i class="fas fa-user-circle text-5xl text-cyan mb-3"></i>
              <h2 class="text-4xl md:text-5xl font-bold text-navy">${escapeHtml(emergencyData.fullName || 'Unknown')}</h2>
              <p class="text-blue text-xs uppercase tracking-widest mt-2 font-medium" data-i18n="emergencyProfile">Emergency Medical Profile</p>
            </div>

            <!-- ② Blood Group (blue, not red) -->
            <div class="bg-blue rounded-xl shadow-lg p-6 text-center text-white fade-in">
              <div class="flex items-center justify-center gap-3 mb-2">
                <i class="fas fa-tint text-lcyan text-3xl"></i>
                <h3 class="text-lg font-bold uppercase tracking-widest text-lcyan" data-i18n="bloodGroup">Blood Group</h3>
              </div>
              <p class="text-7xl font-black tracking-tight leading-none">${escapeHtml(emergencyData.bloodGroup || '?')}</p>
              <p class="text-lcyan text-sm mt-3 font-medium">
                <i class="fas fa-info-circle mr-1"></i><span data-i18n="shareParamedics">Share with paramedics immediately</span>
              </p>
            </div>

            <!-- ③ Basic Info -->
            <div class="bg-white rounded-xl shadow-sm border border-lcyan p-5 fade-in">
              <div class="flex items-center mb-3 gap-2">
                <i class="fas fa-info-circle text-cyan text-xl"></i>
                <h3 class="font-semibold text-navy" data-i18n="basicInfo">Basic Information</h3>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-xlcyan rounded-lg p-3 text-center border border-lcyan">
                  <p class="text-xs text-cyan uppercase tracking-wide mb-1 font-medium" data-i18n="age">Age</p>
                  <p class="text-2xl font-bold text-navy">${emergencyData.age ? escapeHtml(String(emergencyData.age)) : '—'}</p>
                </div>
                <div class="bg-xlcyan rounded-lg p-3 text-center border border-lcyan">
                  <p class="text-xs text-cyan uppercase tracking-wide mb-1 font-medium" data-i18n="gender">Gender</p>
                  <p class="text-2xl font-bold text-navy" data-i18n-gender="${escapeHtml(emergencyData.gender || '')}">${escapeHtml(emergencyData.gender || '—')}</p>
                </div>
              </div>
            </div>

            <!-- ④ First Aid (auto-loaded) -->
            <div class="bg-white rounded-xl shadow-sm border border-lcyan p-5 fade-in">
              <div class="flex items-center gap-2 mb-4">
                <i class="fas fa-first-aid text-cyan text-xl"></i>
                <h3 class="font-semibold text-navy" data-i18n="firstAidTitle">First Aid Instructions</h3>
              </div>
              <div id="firstAidContent">
                <div class="flex items-center justify-center py-6 text-cyan gap-2">
                  <i class="fas fa-spinner fa-spin"></i>
                  <span class="text-sm" data-i18n="loadingInstr">Loading instructions…</span>
                </div>
              </div>
            </div>

            <!-- ⑤ Emergency Contacts — always visible, with call buttons -->
            <div class="bg-white border border-lcyan rounded-xl shadow-sm p-5 fade-in">
              <div class="flex items-center gap-2 mb-4">
                <i class="fas fa-phone-alt text-cyan text-xl"></i>
                <h3 class="font-semibold text-navy" data-i18n="emergencyContact">Emergency Contacts</h3>
                <span class="ml-auto bg-cyan text-white text-xs font-bold px-2 py-1 rounded-full">${totalContacts}</span>
              </div>
              <div class="space-y-3">
                ${emergencyData.emergencyContactNumber ? `
                <a href="tel:${escapeHtml(emergencyData.emergencyContactNumber.replace(/\D/g, ''))}"
                   class="call-pulse flex items-center w-full btn-navy font-bold py-4 px-5 rounded-xl shadow text-base">
                  <i class="fas fa-phone-alt text-xl mr-4 flex-shrink-0"></i>
                  <div class="text-left min-w-0">
                    <div class="truncate">${escapeHtml(emergencyData.emergencyContactName || 'Primary Contact')}</div>
                    <div class="text-xs font-normal text-lcyan mt-0.5" data-i18n="primaryContact">Primary Emergency Contact</div>
                  </div>
                  <span class="ml-auto text-xs bg-white bg-opacity-20 px-2 py-1 rounded-lg flex-shrink-0" data-i18n="tapToCall">TAP TO CALL</span>
                </a>` : ''}
                ${emergencyData.additionalEmergencyContacts.map((c, i) => c.phone ? `
                <a href="tel:${escapeHtml(c.phone.replace(/\D/g, ''))}"
                   class="flex items-center w-full btn-blue font-bold py-4 px-5 rounded-xl shadow text-base">
                  <i class="fas fa-phone-alt text-xl mr-4 flex-shrink-0"></i>
                  <div class="text-left min-w-0">
                    <div class="truncate">${escapeHtml(c.name || 'Contact ' + (i + 2))}</div>
                    <div class="text-xs font-normal text-lcyan mt-0.5">Emergency Contact ${i + 2}</div>
                  </div>
                  <span class="ml-auto text-xs bg-white bg-opacity-20 px-2 py-1 rounded-lg flex-shrink-0">TAP TO CALL</span>
                </a>` : '').join('')}
              </div>
            </div>

            <!-- ⑥ View Full Medical Info — Phone + OTP flow -->
            <div id="accessArea" class="fade-in">

              <!-- Step 1: Enter phone number -->
              <div id="phoneStep" class="bg-white rounded-xl shadow-sm border border-lcyan p-5">
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas fa-lock text-cyan text-xl"></i>
                  <h3 class="font-semibold text-navy" data-i18n="viewFullInfo">View Full Medical Information</h3>
                </div>
                <p class="text-sm text-blue mb-4" data-i18n="enterPhoneDesc">
                  Enter your phone number to receive a one-time OTP. After verifying, an approval request will be sent to the patient's emergency contacts.
                </p>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input type="tel" id="helperPhone"
                         placeholder="+91 9876543210" inputmode="tel"
                         class="flex-1 px-4 py-3 border border-lcyan rounded-lg text-navy text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan">
                  <button onclick="sendHelperOtp()" id="sendOtpBtn"
                          class="btn-navy font-bold px-5 py-3 rounded-lg text-sm flex items-center justify-center gap-2 sm:flex-shrink-0">
                    <i class="fas fa-paper-plane"></i> <span data-i18n="sendOtp">Send OTP</span>
                  </button>
                </div>
                <p id="phoneError" class="text-red-500 text-xs mt-2 hidden"></p>
              </div>

              <!-- Step 2: Enter OTP (hidden initially) -->
              <div id="otpStep" class="hidden bg-white rounded-xl shadow-sm border border-lcyan p-5">
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas fa-mobile-alt text-cyan text-xl"></i>
                  <h3 class="font-semibold text-navy" data-i18n="enterOtpHeading">Enter OTP</h3>
                </div>
                <p class="text-sm text-blue mb-4">
                  <span data-i18n="otpSentTo">OTP sent to</span> <strong id="otpPhoneDisplay"></strong>. <span data-i18n="validFor5">Valid for 5 minutes.</span>
                </p>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input type="text" id="otpInput"
                         placeholder="• • • • • •" maxlength="6" inputmode="numeric"
                         class="flex-1 px-4 py-3 border border-lcyan rounded-lg text-navy text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan">
                  <button onclick="verifyOtp()" id="verifyOtpBtn"
                          class="btn-blue font-bold px-5 py-3 rounded-lg text-sm flex items-center justify-center gap-2 sm:flex-shrink-0">
                    <i class="fas fa-check"></i> <span data-i18n="verify">Verify</span>
                  </button>
                </div>
                <p id="otpError" class="text-red-500 text-xs mt-2 hidden"></p>
                <button onclick="resetToPhone()" class="text-xs text-cyan mt-3 hover:underline block">
                  <i class="fas fa-arrow-left mr-1"></i><span data-i18n="changePhoneNum">Change phone number</span>
                </button>
              </div>

            </div>

            <!-- Approval waiting card (hidden, shown after button click) -->
            <div id="approvalCard" class="hidden bg-navy rounded-2xl shadow-lg p-8 text-center text-white fade-in">
              <i class="fas fa-shield-alt text-lcyan text-5xl mb-4"></i>
              <h2 class="text-xl font-bold mb-2" data-i18n="approvalSent">Approval Request Sent</h2>
              <p class="text-lcyan text-sm mb-6">
                SMS sent to <strong>${totalContacts}</strong> emergency contact${totalContacts > 1 ? 's' : ''}.
                Any one of them can tap <strong>Approve</strong> to unlock full medical details.
              </p>
              <div id="approvalStatus">
                <div class="flex items-center justify-center gap-4 bg-white bg-opacity-10 rounded-xl py-5 px-4">
                  <i class="fas fa-spinner fa-spin text-3xl text-lcyan flex-shrink-0"></i>
                  <div class="text-left">
                    <p class="font-bold text-white" data-i18n="waitingApproval">Waiting for approval…</p>
                    <p class="text-xs text-lcyan mt-1" data-i18n="approveRejectSent">Contact received Approve / Reject links via SMS</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Full medical details (hidden, filled by JS after approval) -->
            <div id="fullMedicalDetails" class="hidden space-y-4 fade-in"></div>

            <!-- Important Notice -->
            <div class="bg-xlcyan border-l-4 border-cyan p-4 rounded-lg">
              <div class="flex items-start gap-3">
                <i class="fas fa-info-circle text-cyan text-lg mt-0.5 flex-shrink-0"></i>
                <div>
                  <p class="text-sm font-semibold text-navy mb-1" data-i18n="importantNotice">Important Notice</p>
                  <p class="text-sm text-blue" data-i18n="importantDesc">
                    This information is for emergency medical purposes only. For life-threatening emergencies, call 112 immediately.
                  </p>
                </div>
              </div>
            </div>

          </main>

          <footer class="bg-navy text-white mt-10 py-5 text-center">
            <i class="fas fa-heartbeat text-lcyan mr-2"></i>
            <span class="text-lcyan text-sm">&copy; 2026 ICE – In Case of Emergency</span>
            <p class="text-cyan text-xs mt-1">For emergencies, call 112 immediately</p>
          </footer>

          <script>
            // Scan timestamp
            document.getElementById('scanTime').textContent = new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            // Silently share GPS location with emergency contacts
            (function shareGPS() {
              if (!navigator.geolocation) return;
              if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
              navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                  const r = await fetch('/emergency/${id}/location', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                  });
                  if ((await r.json()).success) {
                    const b = document.getElementById('locationBanner');
                    b.textContent = t('gpsSent');
                    b.className = 'px-4 py-2 text-center text-sm font-medium fade-in bg-blue text-white';
                    b.classList.remove('hidden');
                  }
                } catch {}
              }, () => {}, { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 });
            })();

            // Auto-load first aid — general steps from client-side translations
            (function loadFirstAid() {
              const container = document.getElementById('firstAidContent');
              let html = '<ol class="list-decimal list-inside space-y-2">';
              ['generalStep1','generalStep2','generalStep3','generalStep4','generalStep5','generalStep6'].forEach(function(key) {
                html += '<li class="text-sm text-blue leading-relaxed" data-i18n="' + key + '">' + t(key) + '</li>';
              });
              html += '</ol>';
              container.innerHTML = html;
            })();

            // ── Helper phone + OTP flow ───────────────────────────────────────

            async function sendHelperOtp() {
              const phone = (document.getElementById('helperPhone').value || '').trim();
              const btn   = document.getElementById('sendOtpBtn');
              const errEl = document.getElementById('phoneError');
              errEl.classList.add('hidden');

              if (!phone) {
                errEl.textContent = 'Please enter your phone number.';
                errEl.classList.remove('hidden');
                return;
              }

              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

              try {
                const r = await fetch('/emergency/${id}/helper-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone })
                });
                const d = await r.json();
                if (!d.success) {
                  errEl.textContent = d.error || 'Failed to send OTP. Please try again.';
                  errEl.classList.remove('hidden');
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
                  return;
                }
                document.getElementById('otpPhoneDisplay').textContent = phone;
                document.getElementById('phoneStep').classList.add('hidden');
                document.getElementById('otpStep').classList.remove('hidden');
                document.getElementById('otpInput').focus();
              } catch {
                errEl.textContent = 'Network error. Please try again.';
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
              }
            }

            async function verifyOtp() {
              const otp   = (document.getElementById('otpInput').value || '').trim();
              const btn   = document.getElementById('verifyOtpBtn');
              const errEl = document.getElementById('otpError');
              errEl.classList.add('hidden');

              if (!otp || otp.length !== 6) {
                errEl.textContent = 'Please enter the 6-digit OTP.';
                errEl.classList.remove('hidden');
                return;
              }

              btn.disabled = true;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

              try {
                const r = await fetch('/emergency/${id}/verify-helper-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ otp })
                });
                const d = await r.json();
                if (!d.success || !d.requestId) {
                  errEl.textContent = d.error || 'Invalid OTP. Please check and try again.';
                  errEl.classList.remove('hidden');
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-check"></i> Verify';
                  return;
                }
                // OTP verified — show approval waiting card
                document.getElementById('accessArea').classList.add('hidden');
                document.getElementById('approvalCard').classList.remove('hidden');
                startPolling(d.requestId);
              } catch {
                errEl.textContent = 'Network error. Please try again.';
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Verify';
              }
            }

            function resetToPhone() {
              document.getElementById('otpStep').classList.add('hidden');
              document.getElementById('phoneStep').classList.remove('hidden');
              document.getElementById('otpInput').value = '';
              const btn = document.getElementById('sendOtpBtn');
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
            }

            // Poll for approval status
            function startPolling(requestId) {
              const statusDiv = document.getElementById('approvalStatus');
              const timer = setInterval(async () => {
                try {
                  const r = await fetch('/emergency/${id}/request-status/' + requestId);
                  const d = await r.json();
                  if (d.status === 'approved') {
                    clearInterval(timer);
                    statusDiv.innerHTML = '<div class="flex items-center justify-center gap-3 py-3"><i class="fas fa-check-circle text-green-400 text-3xl"></i><div class="text-left"><p class="font-bold text-white">Access Approved!</p><p class="text-xs text-lcyan mt-1">Scroll down — helper guide and medical info are now visible</p></div></div>';
                    const details = document.getElementById('fullMedicalDetails');
                    details.classList.remove('hidden');

                    // Fetch patient-specific first aid conditions (now safe to show after approval)
                    let conditions = [];
                    try {
                      const faRes = await fetch('/emergency/${id}/firstaid');
                      const faData = await faRes.json();
                      if (faData.success) conditions = faData.data.conditions || [];
                    } catch {}

                    if (d.data) {
                      displayFullDetails(d.data);
                      showHelperGuide(d.data, conditions);
                    }
                    setTimeout(() => details.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
                  } else if (d.status === 'rejected') {
                    clearInterval(timer);
                    statusDiv.innerHTML = '<div class="py-3 text-white"><i class="fas fa-times-circle text-red-400 text-2xl mr-2"></i><span class="font-semibold">Access rejected by emergency contact.</span></div>';
                  } else if (d.status === 'expired') {
                    clearInterval(timer);
                    document.getElementById('approvalCard').classList.add('hidden');
                    // Reset to phone step so helper can try again
                    document.getElementById('otpStep').classList.add('hidden');
                    document.getElementById('phoneStep').classList.remove('hidden');
                    document.getElementById('otpInput').value = '';
                    const sendBtn = document.getElementById('sendOtpBtn');
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
                    const accessArea = document.getElementById('accessArea');
                    accessArea.classList.remove('hidden');
                    // Show expiry note in phone step
                    const errEl = document.getElementById('phoneError');
                    errEl.textContent = 'Previous request expired. Enter your phone number to try again.';
                    errEl.className = 'text-cyan text-xs mt-2';
                    errEl.classList.remove('hidden');
                    accessArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } catch {}
              }, 3000);
            }

            // Render full medical details after approval
            // ── Helper Guide — shown at the top after approval ────────────────
            function showHelperGuide(data, conditions) {
              const section = document.getElementById('fullMedicalDetails');

              // Build "tell paramedics" summary
              const criticalLines = [];
              criticalLines.push('Patient: <strong>${escapeHtml(emergencyData.fullName)}</strong>, Blood Group: <strong>${escapeHtml(emergencyData.bloodGroup)}</strong>');
              if (data.allergies && data.allergies.toLowerCase() !== 'none')
                criticalLines.push('Allergies: <strong>' + escapeHtml(data.allergies) + '</strong>');
              if (data.medications && data.medications.toLowerCase() !== 'none')
                criticalLines.push('On medications: <strong>' + escapeHtml(data.medications) + '</strong>');
              if (data.medicalConditions && data.medicalConditions.toLowerCase() !== 'none')
                criticalLines.push('Conditions: <strong>' + escapeHtml(data.medicalConditions) + '</strong>');

              let html = '';

              // ── Top banner: what to do right now ─────────────────────────
              html += '<div class="bg-navy rounded-xl p-5 text-white">';
              html += '<div class="flex items-center gap-3 mb-4">';
              html += '<i class="fas fa-hands-helping text-lcyan text-2xl flex-shrink-0"></i>';
              html += '<h3 class="text-lg font-bold">' + t('helperGuideTitle') + '</h3>';
              html += '</div>';

              // Immediate steps
              html += '<div class="space-y-2 mb-4">';
              const immediateSteps = [
                { icon: '📞', text: t('stepCall112'), urgent: true },
                { icon: '🧍', text: t('stepStayWith') },
                { icon: '🫀', text: t('stepCheckAirway') },
                { icon: '🚫', text: t('stepNoFood'), urgent: true },
                { icon: '📍', text: t('stepNoteLocation') }
              ];
              immediateSteps.forEach(s => {
                html += '<div class="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg px-3 py-2">';
                html += '<span class="flex-shrink-0 text-lg">' + s.icon + '</span>';
                html += '<p class="text-sm ' + (s.urgent ? 'font-semibold text-white' : 'text-lcyan') + '">' + s.text + '</p>';
                html += '</div>';
              });
              html += '</div>';

              // Tell paramedics box
              html += '<div class="bg-cyan bg-opacity-20 border border-cyan rounded-lg p-4 mb-1">';
              html += '<p class="text-xs font-bold text-lcyan uppercase tracking-wide mb-2">' + t('tellParamedics') + '</p>';
              criticalLines.forEach(line => {
                html += '<p class="text-sm text-white mb-1">• ' + line + '</p>';
              });
              html += '</div>';
              html += '</div>'; // end bg-navy

              // ── Patient-specific warnings (hidden before approval, shown now) ──
              if (conditions && conditions.length > 0) {
                html += '<div class="bg-white rounded-xl border border-lcyan shadow-sm p-5">';
                html += '<div class="flex items-center gap-2 mb-3">';
                html += '<i class="fas fa-exclamation-triangle text-cyan text-lg"></i>';
                html += '<h4 class="font-semibold text-navy">' + t('patientWarnings') + '</h4>';
                html += '</div>';
                html += '<div class="space-y-3">';
                conditions.forEach(c => {
                  var ck = c.condKey;
                  var warning = ck ? buildCondWarning(ck, c) : escapeHtml(c.warning);
                  var instructions = ck ? buildCondInstructions(ck, c) : c.instructions;
                  html += '<div class="bg-xlcyan rounded-lg p-4 border-l-4 border-cyan">';
                  html += '<p class="font-bold text-navy text-sm mb-2">' + c.icon + ' ' + warning + '</p>';
                  html += '<ul class="space-y-1">';
                  instructions.forEach(function(inst) {
                    var text = typeof inst === 'string' ? inst : inst.text;
                    var bad = inst.bad || (typeof text === 'string' && text.startsWith('DO NOT'));
                    html += '<li class="text-sm flex items-start gap-2">';
                    html += '<span class="flex-shrink-0 mt-0.5">' + (bad ? '🚫' : '✅') + '</span>';
                    html += '<span class="' + (bad ? 'font-semibold text-navy' : 'text-blue') + '">' + text + '</span>';
                    html += '</li>';
                  });
                  html += '</ul></div>';
                });
                html += '</div></div>';
              }

              // Prepend the guide so it appears ABOVE the medical details
              section.insertAdjacentHTML('afterbegin', html);
            }

            function displayFullDetails(data) {
              const section = document.getElementById('fullMedicalDetails');
              let html = '<h3 class="text-lg font-bold text-navy flex items-center gap-2"><i class="fas fa-unlock text-cyan"></i>' + t('fullMedicalInfo') + '</h3>';

              const card = (icon, color, title, body) =>
                '<div class="bg-white rounded-xl border border-lcyan shadow-sm p-5">' +
                '<div class="flex items-center gap-2 mb-3"><i class="' + icon + ' ' + color + ' text-lg"></i><h4 class="font-semibold text-navy">' + title + '</h4></div>' +
                body + '</div>';

              if (data.allergies && data.allergies.toLowerCase() !== 'none')
                html += card('fas fa-allergies','text-cyan',t('allergies'),'<p class="text-blue text-sm info-text">'+escapeHtml(data.allergies)+'</p>');

              if (data.medications && data.medications.toLowerCase() !== 'none')
                html += card('fas fa-pills','text-cyan',t('medications'),'<p class="text-blue text-sm info-text">'+escapeHtml(data.medications)+'</p>');

              if (data.medicalConditions && data.medicalConditions.toLowerCase() !== 'none')
                html += card('fas fa-heartbeat','text-cyan',t('medicalConditions'),'<p class="text-blue text-sm info-text">'+escapeHtml(data.medicalConditions)+'</p>');

              if (data.knownTriggers && data.knownTriggers.trim())
                html += card('fas fa-exclamation-triangle','text-cyan',t('knownTriggers'),'<p class="text-blue text-sm info-text">'+escapeHtml(data.knownTriggers)+'</p>');

              if (data.doctorName || data.doctorPhone || data.preferredHospital) {
                let body = '';
                if (data.doctorName) body += '<p class="text-blue text-sm mb-1"><span class="font-medium text-navy">Doctor:</span> '+escapeHtml(data.doctorName)+'</p>';
                if (data.doctorPhone) body += '<p class="text-blue text-sm mb-1"><span class="font-medium text-navy">Phone:</span> <a href="tel:'+escapeHtml(data.doctorPhone.replace(/\\D/g,''))+'" class="underline">'+escapeHtml(data.doctorPhone)+'</a></p>';
                if (data.preferredHospital) body += '<p class="text-blue text-sm"><span class="font-medium text-navy">Hospital:</span> '+escapeHtml(data.preferredHospital)+'</p>';
                html += card('fas fa-user-md','text-cyan',t('doctorHospital'),body);
              }

              if (data.insuranceProvider || data.insurancePolicyNumber) {
                let body = '';
                if (data.insuranceProvider) body += '<p class="text-blue text-sm mb-1"><span class="font-medium text-navy">Provider:</span> '+escapeHtml(data.insuranceProvider)+'</p>';
                if (data.insurancePolicyNumber) body += '<p class="text-blue text-sm"><span class="font-medium text-navy">Policy No:</span> '+escapeHtml(data.insurancePolicyNumber)+'</p>';
                html += card('fas fa-shield-alt','text-cyan',t('insuranceCard'),body);
              }

              if (data.governmentIdNumber)
                html += card('fas fa-id-card','text-cyan',t('govId'),'<p class="text-blue font-mono">'+escapeHtml(data.governmentIdNumber)+'</p>');

              if (data.dietaryRestrictions)
                html += card('fas fa-utensils','text-cyan',t('dietaryCard'),'<p class="text-blue text-sm">'+escapeHtml(data.dietaryRestrictions)+'</p>');

              if (data.organDonor === true || data.organDonor === 'true')
                html += card('fas fa-heart','text-cyan',t('organDonorCard'),'<p class="font-semibold text-blue">✓ ' + t('organDonorRegistered') + '</p>');

              if (data.address || data.city || data.state) {
                const parts = [data.address, data.city, data.state].filter(Boolean);
                html += card('fas fa-map-marker-alt','text-cyan',t('homeAddress'),'<p class="text-blue text-sm">'+escapeHtml(parts.join(', '))+'</p>');
              }

              if (data.notes && data.notes.trim())
                html += card('fas fa-sticky-note','text-cyan',t('additionalNotes'),'<p class="text-blue text-sm info-text">'+escapeHtml(data.notes)+'</p>');

              section.innerHTML = html;
            }

            function escapeHtml(t) {
              if (!t) return '';
              return String(t).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
            }

            function buildCondWarning(ck, c) {
              var STATIC_KEYS = ['diabetes','heart','epilepsy','asthma','hyper','bloodthin','kidney'];
              if (STATIC_KEYS.indexOf(ck) !== -1) return t('cond_' + ck + '_w');
              var val = escapeHtml(c.dynValue || '');
              if (ck === 'allergy') return t('cond_allergy_w') + ' ' + val;
              if (ck === 'triggers') return t('cond_triggers_w') + ' ' + val;
              if (ck === 'doctor') return t('cond_doctor_w') + ' ' + val;
              if (ck === 'hospital') return t('cond_hospital_w') + ' ' + val;
              if (ck === 'blood') return t('cond_blood_w') + ' ' + val;
              return escapeHtml(c.warning);
            }

            function buildCondInstructions(ck, c) {
              var STATIC_KEYS = ['diabetes','heart','epilepsy','asthma','hyper','bloodthin','kidney'];
              var COUNT = {diabetes:6,heart:7,epilepsy:7,asthma:6,hyper:6,bloodthin:5,kidney:4};
              if (STATIC_KEYS.indexOf(ck) !== -1) {
                var result = [];
                for (var i = 1; i <= COUNT[ck]; i++) {
                  var key = 'cond_' + ck + '_' + i;
                  var text = t(key);
                  result.push({ text: text, bad: text.indexOf('DO NOT') === 0 || text.indexOf('न दें') === 0 || text.indexOf('न ददातु') === 0 || text.indexOf('देऊ नका') === 0 || text.indexOf('கொடுக்காதீர்கள்') === 0 || text.indexOf('ಕೊಡಬೇಡಿ') === 0 || text.indexOf('ఇవ్వకండి') === 0 });
                }
                return result;
              }
              var val = escapeHtml(c.dynValue || '');
              var phone = escapeHtml(c.dynPhone || '');
              if (ck === 'allergy') return [
                { text: t('cond_allergy_1') + ' ' + val, bad: true },
                { text: t('cond_allergy_2'), bad: false },
                { text: t('cond_allergy_3'), bad: false },
                { text: t('cond_allergy_4'), bad: false }
              ];
              if (ck === 'triggers') return [
                { text: t('cond_triggers_1') + ' ' + val, bad: false },
                { text: t('cond_triggers_2'), bad: false },
                { text: t('cond_triggers_3'), bad: false }
              ];
              if (ck === 'doctor') {
                var di = [{ text: t('cond_doctor_1'), bad: false }];
                if (phone) di.push({ text: t('cond_doctor_2') + ' ' + phone, bad: false });
                return di;
              }
              if (ck === 'hospital') return [
                { text: t('cond_hospital_1') + ' ' + val, bad: false },
                { text: t('cond_hospital_2'), bad: false },
                { text: t('cond_hospital_3'), bad: false }
              ];
              if (ck === 'blood') return [
                { text: t('cond_blood_1') + ' ' + val, bad: false },
                { text: t('cond_blood_2'), bad: false },
                { text: t('cond_blood_3'), bad: false }
              ];
              return c.instructions.map(function(s) { return { text: escapeHtml(s), bad: s.startsWith('DO NOT') }; });
            }

            // ── Multi-language support ────────────────────────────────────────
            function initLang() {
              var sel = document.getElementById('langSelect');
              if (!sel || typeof TRANSLATIONS === 'undefined') return;
              var cur = getCurrentLang();
              Object.keys(TRANSLATIONS).forEach(function(code) {
                var d = TRANSLATIONS[code];
                var opt = document.createElement('option');
                opt.value = code;
                opt.textContent = d.flag + ' ' + d.langName;
                opt.selected = (code === cur);
                sel.appendChild(opt);
              });
              applyLang();
            }
            function applyLang() {
              if (typeof TRANSLATIONS === 'undefined') return;
              if (typeof t !== 'function') return;
              var lang = getCurrentLang();
              document.documentElement.lang = lang;
              document.documentElement.dir = (TRANSLATIONS[lang] && TRANSLATIONS[lang].dir) || 'ltr';
              document.querySelectorAll('[data-i18n]').forEach(function(el) {
                try {
                  var val = t(el.getAttribute('data-i18n'));
                  if (val) {
                    var n = el.getAttribute('data-i18n-n');
                    if (n) val = val.replace('{n}', n);
                    el.textContent = val;
                  }
                } catch(e) { /* skip */ }
              });
              var genderMap = { 'Male':'genderMale','Female':'genderFemale','Other':'genderOther','Prefer not to say':'genderNoSay' };
              document.querySelectorAll('[data-i18n-gender]').forEach(function(el) {
                var raw = el.getAttribute('data-i18n-gender');
                var key = genderMap[raw];
                if (key) el.textContent = t(key);
              });
            }
            function changeLang(lang) {
              setLanguage(lang);
              applyLang();
            }
            initLang();
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

/**
 * Receive scanner's GPS location and notify emergency contact
 * POST /emergency/:id/location
 */
const reportScanLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return next(new AppError('Valid lat and lng are required', 400));
    }

    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    // Save scanner location to scan log
    await Profile.findOneAndUpdate(
      { uniqueId: id },
      { 'lastQrScan.scannerLocation': { lat, lng } }
    );

    // Notify ALL emergency contacts with precise GPS location
    const allContacts = [
      profile.emergencyContactNumber,
      ...(profile.additionalEmergencyContacts || []).map(c => c.phone)
    ].filter(Boolean);
    await Promise.all(allContacts.map(phone => notifyScanLocation(phone, profile.fullName, lat, lng)));

    res.status(200).json({ success: true, message: 'Location shared with emergency contact' });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper — plain HTML page returned to contact after approve/reject tap
 */
function accessResponseHtml(outcome, patientName) {
  const name = escapeHtml(patientName || 'Unknown');
  const map = {
    approved:         { emoji: '✅', title: 'Access Approved',   color: '#00B4D8', msg: `You approved emergency access for <strong>${name}</strong>. The first responder can now see the full medical information.` },
    rejected:         { emoji: '🚫', title: 'Access Rejected',   color: '#03045E', msg: `You rejected the access request for <strong>${name}</strong>.` },
    expired:          { emoji: '⏰', title: 'Link Expired',       color: '#0077B6', msg: `This link for <strong>${name}</strong> has expired.` },
    already_approved: { emoji: '✅', title: 'Already Approved',   color: '#00B4D8', msg: `Access for <strong>${name}</strong> was already approved.` },
    already_rejected: { emoji: '🚫', title: 'Already Rejected',   color: '#03045E', msg: `Access for <strong>${name}</strong> was already rejected.` },
    invalid:          { emoji: '❌', title: 'Invalid Link',       color: '#0077B6', msg: 'This approval link is not valid or has already been used.' },
    not_found:        { emoji: '🔍', title: 'Not Found',          color: '#0077B6', msg: 'Emergency profile not found.' }
  };
  const c = map[outcome] || map['invalid'];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.title} – ICE</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#CAF0F8}.card{background:#fff;border-radius:18px;padding:40px 32px;max-width:380px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(3,4,94,.12)}.emoji{font-size:56px;margin-bottom:16px}h1{color:#03045E;margin:0 0 12px;font-size:1.4rem}p{color:#0077B6;margin:0;line-height:1.5}small{color:#90E0EF;display:block;margin-top:24px;font-size:.75rem}</style></head><body><div class="card"><div class="emoji">${c.emoji}</div><h1>${c.title}</h1><p>${c.msg}</p><small>ICE – In Case of Emergency &nbsp;·&nbsp; You can close this page.</small></div></body></html>`;
}

/**
 * Single decide page — shows Approve/Reject buttons in one tap
 * GET /emergency/decide/:id/:requestId
 */
const showDecidePage = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) return res.send(accessResponseHtml('not_found', ''));

    const ar = profile.accessRequest;
    if (!ar || ar.requestId !== requestId) return res.send(accessResponseHtml('invalid', profile.fullName));
    if (new Date() > ar.expiresAt)          return res.send(accessResponseHtml('expired', profile.fullName));
    if (ar.status === 'approved')           return res.send(accessResponseHtml('already_approved', profile.fullName));
    if (ar.status === 'rejected')           return res.send(accessResponseHtml('already_rejected', profile.fullName));

    const name = escapeHtml(profile.fullName || 'Unknown');
    const bg = escapeHtml(profile.bloodGroup || '');
    const approveHref = `/emergency/${id}/approve/${requestId}`;
    const rejectHref  = `/emergency/${id}/reject/${requestId}`;

    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access Request – ICE</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#CAF0F8}.card{background:#fff;border-radius:18px;padding:36px 28px;max-width:380px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(3,4,94,.12)}h1{color:#03045E;margin:0 0 8px;font-size:1.3rem}.sub{color:#0077B6;margin:0 0 6px;font-size:.95rem}.bg{display:inline-block;background:#03045E;color:#90E0EF;border-radius:8px;padding:4px 14px;font-size:1rem;font-weight:700;margin-bottom:18px}.info{color:#555;font-size:.85rem;margin-bottom:24px;line-height:1.5}.btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:1.1rem;font-weight:700;cursor:pointer;margin-bottom:12px;text-decoration:none}.approve{background:#00B4D8;color:#fff}.approve:hover{background:#0096c7}.reject{background:#f1f3f5;color:#03045E}.reject:hover{background:#dee2e6}small{color:#90E0EF;font-size:.72rem}</style></head><body><div class="card"><div style="font-size:48px;margin-bottom:12px">🚨</div><h1>Medical Info Access</h1><p class="sub">Patient: <strong>${name}</strong></p>${bg ? `<div class="bg">Blood Group: ${bg}</div>` : ''}<p class="info">A first responder is requesting full medical information. Do you approve?</p><a class="btn approve" href="${approveHref}">✅ Approve Access</a><a class="btn reject" href="${rejectHref}">🚫 Reject</a><small>ICE – In Case of Emergency &nbsp;·&nbsp; Valid for 10 minutes</small></div></body></html>`);
  } catch (error) { next(error); }
};

/**
 * Contact approves access request
 * GET /emergency/:id/approve/:requestId
 */
const approveAccessRequest = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) return res.send(accessResponseHtml('not_found', ''));

    const ar = profile.accessRequest;
    if (!ar || ar.requestId !== requestId) return res.send(accessResponseHtml('invalid', profile.fullName));
    if (new Date() > ar.expiresAt)          return res.send(accessResponseHtml('expired', profile.fullName));
    if (ar.status === 'approved')           return res.send(accessResponseHtml('already_approved', profile.fullName));
    if (ar.status === 'rejected')           return res.send(accessResponseHtml('already_rejected', profile.fullName));

    await Profile.findOneAndUpdate({ uniqueId: id }, { 'accessRequest.status': 'approved' });
    return res.send(accessResponseHtml('approved', profile.fullName));
  } catch (error) { next(error); }
};

/**
 * Contact rejects access request
 * GET /emergency/:id/reject/:requestId
 */
const rejectAccessRequest = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) return res.send(accessResponseHtml('not_found', ''));

    const ar = profile.accessRequest;
    if (!ar || ar.requestId !== requestId) return res.send(accessResponseHtml('invalid', profile.fullName));
    if (new Date() > ar.expiresAt)          return res.send(accessResponseHtml('expired', profile.fullName));
    if (ar.status !== 'pending')            return res.send(accessResponseHtml('already_' + ar.status, profile.fullName));

    await Profile.findOneAndUpdate({ uniqueId: id }, { 'accessRequest.status': 'rejected' });
    return res.send(accessResponseHtml('rejected', profile.fullName));
  } catch (error) { next(error); }
};

/**
 * Scanner polls this to check whether a contact approved/rejected
 * GET /emergency/:id/request-status/:requestId
 */
const getAccessRequestStatus = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const profile = await Profile.findOne({ uniqueId: id });

    if (!profile || !profile.accessRequest || profile.accessRequest.requestId !== requestId) {
      return res.json({ status: 'not_found' });
    }
    if (new Date() > profile.accessRequest.expiresAt) {
      return res.json({ status: 'expired' });
    }
    if (profile.accessRequest.status !== 'approved') {
      return res.json({ status: profile.accessRequest.status }); // 'pending' or 'rejected'
    }

    // Approved — return sensitive data so the scanner's page can display it
    return res.json({
      status: 'approved',
      data: {
        medicalConditions:    profile.medicalConditions    || 'None',
        allergies:            profile.allergies            || 'None',
        medications:          profile.medications          || 'None',
        knownTriggers:        profile.knownTriggers        || null,
        organDonor:           profile.organDonor           || false,
        doctorName:           profile.doctorName           || null,
        doctorPhone:          profile.doctorPhone          || null,
        preferredHospital:    profile.preferredHospital    || null,
        insuranceProvider:    profile.insuranceProvider    || null,
        insurancePolicyNumber:profile.insurancePolicyNumber|| null,
        governmentIdNumber:   profile.governmentIdNumber   || null,
        dietaryRestrictions:  profile.dietaryRestrictions  || null,
        address:              profile.address              || null,
        city:                 profile.city                 || null,
        state:                profile.state                || null,
        notes:                profile.notes                || null
      }
    });
  } catch (error) { next(error); }
};

/**
 * Step 1 — Helper enters phone number → receive OTP
 * POST /emergency/:id/helper-otp
 */
const sendHelperOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const clean = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+91|0)?[6-9]\d{9}$/.test(clean)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid Indian phone number' });
    }

    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Profile.findOneAndUpdate(
      { uniqueId: id },
      {
        'helperRequest.phone':       clean,
        'helperRequest.otpCode':     otpCode,
        'helperRequest.otpExpiresAt': new Date(Date.now() + 5 * 60 * 1000),
        'helperRequest.requestedAt':  new Date()
      }
    );

    const { sendSMS } = require('../utils/notifications');
    const digits = clean.replace(/\D/g, '').slice(-10);
    const message = `ICE App: Your OTP to request medical information access is ${otpCode}. Valid for 5 minutes. Do not share this code.`;

    console.log('\n' + '='.repeat(55));
    console.log('🔑 HELPER OTP');
    console.log(`Phone : ${clean}`);
    console.log(`OTP   : ${otpCode}`);
    console.log('='.repeat(55) + '\n');

    await sendSMS(digits, message);
    res.json({ success: true });
  } catch (error) { next(error); }
};

/**
 * Step 2 — Helper verifies OTP → approval request sent to emergency contacts
 * POST /emergency/:id/verify-helper-otp
 */
const verifyHelperOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp || !otp.trim()) {
      return res.status(400).json({ success: false, error: 'OTP is required' });
    }

    // Need otpCode in the result — use findOne without select restriction
    const profile = await Profile.findOne({ uniqueId: id });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const hr = profile.helperRequest;
    if (!hr || !hr.otpCode) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    }
    if (new Date() > hr.otpExpiresAt) {
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });
    }
    if (hr.otpCode !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP. Please check and try again.' });
    }

    // OTP valid — create access request
    const requestId = crypto.randomBytes(6).toString('hex');
    const baseUrl   = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).trim();
    const approveUrl = `${baseUrl}/emergency/${id}/approve/${requestId}`;
    const rejectUrl  = `${baseUrl}/emergency/${id}/reject/${requestId}`;
    const decideUrl  = `${baseUrl}/emergency/decide/${id}/${requestId}`;

    await Profile.findOneAndUpdate(
      { uniqueId: id },
      {
        accessRequest: {
          requestId,
          helperPhone: hr.phone,
          status:    'pending',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          createdAt: new Date()
        },
        'helperRequest.otpCode': null // clear OTP after use
      }
    );

    const allContacts = [
      profile.emergencyContactNumber,
      ...(profile.additionalEmergencyContacts || []).map(c => c.phone)
    ].filter(Boolean);

    const scannerIP = req.ip || req.connection?.remoteAddress;
    const ipLocation = await getIPLocation(scannerIP);
    const scanTime = new Date();

    console.log('\n' + '='.repeat(65));
    console.log('🔔 ACCESS REQUEST (OTP VERIFIED)');
    console.log('='.repeat(65));
    console.log(`Patient      : ${profile.fullName}`);
    console.log(`Helper Phone : ${hr.phone}`);
    console.log(`Contacts     : ${allContacts.join(', ')}`);
    console.log(`DECIDE       : ${decideUrl}`);
    console.log('='.repeat(65) + '\n');

    allContacts.forEach(phone =>
      notifyApprovalRequest(phone, profile.fullName, profile.bloodGroup, decideUrl, scanTime, ipLocation)
    );

    res.json({ success: true, requestId });
  } catch (error) { next(error); }
};

module.exports = {
  getEmergencyInfo,
  getFirstAid,
  reportScanLocation,
  sendHelperOtp,
  verifyHelperOtp,
  showDecidePage,
  approveAccessRequest,
  rejectAccessRequest,
  getAccessRequestStatus
};
