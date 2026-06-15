/**
 * Emergency Information Display JavaScript
 * Handles loading and displaying emergency medical information
 */

let profileData = null;

// Initialize emergency page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initLanguageSelector();
    applyTranslations();

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
        showError(t('noProfileFound'));
        return;
    }

    // Load profile data
    loadEmergencyData(profileId);
});

/**
 * Populate language selector dropdown from TRANSLATIONS
 */
function initLanguageSelector() {
    const selector = document.getElementById('languageSelector');
    if (!selector) return;
    const currentLang = getCurrentLang();
    Object.entries(TRANSLATIONS).forEach(([code, data]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${data.flag} ${data.langName}`;
        option.selected = code === currentLang;
        selector.appendChild(option);
    });
}

/**
 * Apply current language translations to all data-i18n elements
 */
function applyTranslations() {
    if (typeof TRANSLATIONS === 'undefined') return;
    if (typeof t !== 'function') return;
    const lang = getCurrentLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = TRANSLATIONS[lang]?.dir || 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        try {
            const key = el.getAttribute('data-i18n');
            const value = t(key);
            if (value) el.textContent = value;
        } catch(e) { /* skip individual element errors */ }
    });
}

/**
 * Change language, persist to localStorage, and re-render
 */
function changeLanguage(lang) {
    setLanguage(lang);
    applyTranslations();
    if (profileData) {
        displayEmergencyInfo();
    }
}

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
            throw new Error(result.error || t('noProfileFound'));
        }

        profileData = result.data;
        displayEmergencyInfo();

    } catch (error) {
        console.error('Error loading emergency data:', error);
        showError(t('notFoundDesc'));
    }
}

/**
 * Display emergency information on the page
 */
function displayEmergencyInfo() {
    // Hide loading state
    document.getElementById('loadingState').classList.add('hidden');

    // Display name
    document.getElementById('displayName').textContent = profileData.fullName || t('unknown');

    // Display age and gender
    document.getElementById('displayAge').textContent = profileData.age || t('notSpecified');
    document.getElementById('displayGender').textContent = profileData.gender || t('notSpecified');

    // Display blood group
    const bloodGroup = profileData.bloodGroup || t('unknown');
    document.getElementById('displayBloodGroup').textContent = bloodGroup;

    // Display allergies
    const allergies = profileData.allergies || t('none');
    document.getElementById('displayAllergies').textContent = allergies;

    // Hide allergies section if none
    const noAllergies = !profileData.allergies || profileData.allergies.toLowerCase() === 'none' || !profileData.allergies.trim();
    document.getElementById('allergiesSection').classList.toggle('hidden', noAllergies);

    // Display medical conditions
    const conditions = profileData.medicalConditions || t('none');
    document.getElementById('displayConditions').textContent = conditions;

    // Hide conditions section if none
    const noConditions = !profileData.medicalConditions || profileData.medicalConditions.toLowerCase() === 'none' || !profileData.medicalConditions.trim();
    document.getElementById('conditionsSection').classList.toggle('hidden', noConditions);

    // Display medications
    const medications = profileData.medications || t('none');
    document.getElementById('displayMedications').textContent = medications;

    // Hide medications section if none
    const noMedications = !profileData.medications || profileData.medications.toLowerCase() === 'none' || !profileData.medications.trim();
    document.getElementById('medicationsSection').classList.toggle('hidden', noMedications);

    // Display emergency contact
    const contactName = profileData.emergencyContactName || t('notSpecified');
    const contactPhone = profileData.emergencyContactNumber || profileData.emergencyContactPhone || '';

    document.getElementById('displayContactName').textContent = contactName;

    // Set up phone link
    const phoneLink = document.getElementById('displayContactPhone');
    const callText = document.getElementById('callContactText');
    if (contactPhone) {
        const cleanPhone = contactPhone.replace(/\D/g, ''); // Remove non-digits
        phoneLink.href = `tel:${cleanPhone}`;
        phoneLink.classList.remove('opacity-50', 'cursor-not-allowed');
        phoneLink.onclick = null;
        callText.textContent = `${t('callContact')}: ${contactPhone}`;
    } else {
        phoneLink.href = '#';
        callText.textContent = t('phoneNotAvailable');
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
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && message) {
        errorMessage.textContent = message;
        errorMessage.removeAttribute('data-i18n');
    }

    errorState.classList.remove('hidden');
}

// Handle phone link clicks (for analytics or logging in production)
document.addEventListener('click', function(e) {
    if (e.target.closest('#displayContactPhone')?.href?.startsWith('tel:')) {
        console.log('Emergency contact called:', e.target.closest('#displayContactPhone').href);
    }
});
