/**
 * API Configuration
 * Automatically uses the current server's URL so QR codes always work —
 * whether accessed via localhost, local IP, or Cloudflare tunnel.
 */

// In a browser, window.location.origin gives the correct base URL automatically.
// On laptop: http://localhost:3000
// Via Cloudflare: https://abc-xyz.trycloudflare.com
// Via local IP: http://192.168.1.5:3000
const API_BASE_URL = (typeof window !== 'undefined')
    ? window.location.origin
    : (process.env.BASE_URL || 'http://localhost:3000');

// API endpoints
const API_ENDPOINTS = {
    // Authentication
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    GET_ME: `${API_BASE_URL}/api/auth/me`,
    // Profile
    CREATE_PROFILE: `${API_BASE_URL}/api/profile`,
    GET_PROFILE: (id) => `${API_BASE_URL}/api/profile/${id}`,
    UPDATE_PROFILE: (id) => `${API_BASE_URL}/api/profile/${id}`,
    // Emergency
    GET_EMERGENCY: (id) => `${API_BASE_URL}/emergency/${id}`
};

// Export for use in other files (Node.js context)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL, API_ENDPOINTS };
}
