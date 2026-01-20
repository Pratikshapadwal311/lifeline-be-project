/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 */

// Backend API base URL
// In development, this should point to your Express server (default: http://localhost:3000)
// In production, update this to your deployed backend URL
const API_BASE_URL = 'http://localhost:3000';

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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL, API_ENDPOINTS };
}
