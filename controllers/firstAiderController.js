/**
 * First-Aider Alert Controller
 * Handles broadcasting emergency alerts to nearby registered first-aiders via Socket.io
 */

/**
 * Haversine formula – returns distance in metres between two GPS coordinates
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALERT_RADIUS_METERS = 500;
const { sendSMS } = require('../utils/notifications');

/**
 * POST /api/alert/nearby
 * Body: { lat, lng, profileId, patientName, bloodGroup }
 * 1. Emits `emergency-alert` via Socket.io to nearby volunteers (browser alert)
 * 2. Sends SMS via Fast2SMS to each nearby volunteer's phone number
 */
const alertNearby = async (req, res) => {
  try {
    const { lat, lng, profileId, patientName, bloodGroup } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, error: 'Rescuer location (lat, lng) is required' });
    }

    const io = req.app.locals.io;
    const volunteerRegistry = req.app.locals.volunteerRegistry;

    if (!io || !volunteerRegistry) {
      return res.status(500).json({ success: false, error: 'Real-time service not available' });
    }

    let alertedCount = 0;
    const smsPromises = [];

    volunteerRegistry.forEach((volunteer, socketId) => {
      if (volunteer.lat == null || volunteer.lng == null) return;

      const distance = haversineDistance(lat, lng, volunteer.lat, volunteer.lng);

      if (distance <= ALERT_RADIUS_METERS) {
        // 1 — Real-time browser alert via Socket.io
        io.to(socketId).emit('emergency-alert', {
          profileId: profileId || null,
          patientName: patientName || 'Unknown',
          bloodGroup: bloodGroup || 'Unknown',
          distance: Math.round(distance),
          emergencyLat: lat,
          emergencyLng: lng,
          timestamp: new Date().toISOString()
        });

        // 2 — SMS alert to volunteer's registered phone number
        if (volunteer.phone) {
          const smsText =
            `ICE EMERGENCY ALERT! ` +
            `Patient: ${patientName || 'Unknown'} | ` +
            `Blood Group: ${bloodGroup || 'Unknown'} | ` +
            `Distance: ${Math.round(distance)}m from you. ` +
            `Please help immediately and call 112.`;
          smsPromises.push(sendSMS(volunteer.phone, smsText));
        }

        alertedCount++;
      }
    });

    // Send all SMS in parallel (don't wait for them to respond)
    if (smsPromises.length > 0) {
      Promise.all(smsPromises).catch(err =>
        console.error('[Alert] SMS sending error:', err)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        alerted: alertedCount,
        totalOnline: volunteerRegistry.size,
        message:
          alertedCount > 0
            ? `${alertedCount} first-aider(s) alerted within 500m!`
            : volunteerRegistry.size > 0
            ? 'No first-aiders are within 500m right now'
            : 'No first-aiders are currently online'
      }
    });
  } catch (error) {
    console.error('Alert nearby error:', error);
    res.status(500).json({ success: false, error: 'Failed to send alert' });
  }
};

/**
 * GET /api/volunteers/count
 * Returns how many first-aiders are currently connected and active
 */
const getVolunteerCount = (req, res) => {
  const volunteerRegistry = req.app.locals.volunteerRegistry;
  const count = volunteerRegistry ? volunteerRegistry.size : 0;
  res.status(200).json({ success: true, data: { count } });
};

module.exports = { alertNearby, getVolunteerCount };
