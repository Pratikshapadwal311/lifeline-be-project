/**
 * Emergency Information Display JavaScript
 * Handles loading and displaying emergency medical information
 */

let profileData = null;

// Initialize emergency page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get profile ID from URL parameter or path
    // Support both /emergency/:id and ?profileId=:id formats
    const urlParams = new URLSearchParams(window.location.search);
    let profileId = urlParams.get('profileId');
    
    // If no query param, try to get from path (e.g., /emergency/abc123)
    if (!profileId) {
        const pathParts = window.location.pathname.split('/');
        const emergencyIndex = pathParts.indexOf('emergency');
        if (emergencyIndex !== -1 && pathParts[emergencyIndex + 1]) {
            profileId = pathParts[emergencyIndex + 1];
        }
    }
    
    if (!profileId) {
        showError('No profile ID provided.');
        return;
    }
    
    // Load profile data
    loadEmergencyData(profileId);
});

/**
 * Load emergency data from backend API
 */
async function loadEmergencyData(profileId) {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('emergencyInfo').classList.add('hidden');
    
    try {
        // Fetch emergency data from backend
        const response = await fetch(API_ENDPOINTS.GET_EMERGENCY(profileId));
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Emergency information not found');
        }
        
        profileData = result.data;
        displayEmergencyInfo();
        
    } catch (error) {
        console.error('Error loading emergency data:', error);
        showError('Emergency information not found. Please check the QR code or contact emergency services.');
    }
}

/**
 * Display emergency information on the page
 */
function displayEmergencyInfo() {
    // Hide loading state
    document.getElementById('loadingState').classList.add('hidden');
    
    // Display name
    document.getElementById('displayName').textContent = profileData.fullName || 'Unknown';
    
    // Display age and gender
    document.getElementById('displayAge').textContent = profileData.age || 'Not specified';
    document.getElementById('displayGender').textContent = profileData.gender || 'Not specified';
    
    // Display blood group
    const bloodGroup = profileData.bloodGroup || 'Unknown';
    document.getElementById('displayBloodGroup').textContent = bloodGroup;
    
    // Display allergies
    const allergies = profileData.allergies || 'None';
    document.getElementById('displayAllergies').textContent = allergies;
    
    // Hide allergies section if none
    if (allergies.toLowerCase() === 'none' || !allergies.trim()) {
        document.getElementById('allergiesSection').classList.add('hidden');
    }
    
    // Display medical conditions
    const conditions = profileData.medicalConditions || 'None';
    document.getElementById('displayConditions').textContent = conditions;
    
    // Hide conditions section if none
    if (conditions.toLowerCase() === 'none' || !conditions.trim()) {
        document.getElementById('conditionsSection').classList.add('hidden');
    }
    
    // Display medications
    const medications = profileData.medications || 'None';
    document.getElementById('displayMedications').textContent = medications;
    
    // Hide medications section if none
    if (medications.toLowerCase() === 'none' || !medications.trim()) {
        document.getElementById('medicationsSection').classList.add('hidden');
    }
    
    // Display emergency contact
    const contactName = profileData.emergencyContactName || 'Not specified';
    const contactPhone = profileData.emergencyContactNumber || profileData.emergencyContactPhone || '';
    
    document.getElementById('displayContactName').textContent = contactName;
    
    // Set up phone link
    const phoneLink = document.getElementById('displayContactPhone');
    if (contactPhone) {
        const cleanPhone = contactPhone.replace(/\D/g, ''); // Remove non-digits
        phoneLink.href = `tel:${cleanPhone}`;
        phoneLink.textContent = `Call ${contactPhone}`;
    } else {
        phoneLink.href = '#';
        phoneLink.textContent = 'Phone number not available';
        phoneLink.classList.add('opacity-50', 'cursor-not-allowed');
        phoneLink.onclick = function(e) {
            e.preventDefault();
            return false;
        };
    }
    
    // Show emergency info
    document.getElementById('emergencyInfo').classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emergencyInfo').classList.add('hidden');
    
    const errorState = document.getElementById('errorState');
    const errorMessage = errorState.querySelector('p');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    errorState.classList.remove('hidden');
}

// Handle phone link clicks (for analytics or logging in production)
document.addEventListener('click', function(e) {
    if (e.target.id === 'displayContactPhone' && e.target.href.startsWith('tel:')) {
        // In production, you might want to log this event
        console.log('Emergency contact called:', e.target.href);
    }
});

