/**
 * Registration/Profile Creation JavaScript
 * Handles form validation and submission
 */

// Form validation and submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('emergencyForm');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        form.querySelector('button[type="submit"]').disabled = true;
        
        // Collect form data
        const formData = collectFormData();
        
        // Call backend API to create profile
        try {
            const response = await createProfileAPI(formData);
            
            // Store profile ID for navigation
            const profileId = response.profileId;
            localStorage.setItem('ice_current_profile', profileId);
            
            // Store QR code data URL for display
            if (response.qrCode) {
                localStorage.setItem('ice_qr_' + profileId, response.qrCode);
            }
            
            // Redirect to QR code page
            window.location.href = `qr.html?profileId=${profileId}`;
            
        } catch (error) {
            console.error('Error creating profile:', error);
            
            // Show user-friendly error message
            let errorMessage = 'Error creating profile. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
            loadingIndicator.classList.add('hidden');
            form.querySelector('button[type="submit"]').disabled = false;
        }
    });
    
    // Real-time validation for static fields
    form.querySelectorAll('input:not([id^="contact"]), select, textarea').forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            const errorSpan = input.parentElement.querySelector('.error-message');
            if (errorSpan) {
                errorSpan.classList.add('hidden');
                input.classList.remove('border-red-500');
            }
        });
    });
});

/**
 * Validate the entire form
 */
function validateForm() {
    const form = document.getElementById('emergencyForm');
    let isValid = true;

    // Required basic fields
    const requiredFields = ['fullName', 'age', 'bloodGroup'];
    requiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (!validateField(field)) isValid = false;
    });

    // Validate gender radio buttons
    const genderSelected = document.querySelector('input[name="gender"]:checked');
    if (!genderSelected) {
        const genderError = document.querySelector('input[name="gender"]').parentElement.parentElement.querySelector('.error-message');
        if (genderError) {
            genderError.textContent = 'Please select a gender';
            genderError.classList.remove('hidden');
        }
        isValid = false;
    }

    // Validate first 3 contacts — all required
    for (let i = 0; i < 3; i++) {
        const nameInput  = document.getElementById('contactName_' + i);
        const phoneInput = document.getElementById('contactPhone_' + i);
        const label = i === 0 ? 'Primary contact' : 'Contact ' + (i + 1);

        if (!nameInput || !nameInput.value.trim()) {
            if (nameInput) showFieldError(nameInput, label + ' name is required');
            isValid = false;
        }
        if (!phoneInput || !phoneInput.value.trim()) {
            if (phoneInput) showFieldError(phoneInput, label + ' phone number is required');
            isValid = false;
        } else if (!isValidPhoneNumber(phoneInput.value)) {
            showFieldError(phoneInput, 'Please enter a valid Indian phone number');
            isValid = false;
        }
    }

    // Validate 4th contact phone if entered (optional but must be valid)
    const fourthPhone = document.getElementById('contactPhone_3');
    if (fourthPhone && fourthPhone.value.trim() && !isValidPhoneNumber(fourthPhone.value)) {
        showFieldError(fourthPhone, 'Please enter a valid Indian phone number');
        isValid = false;
    }

    // Validate age
    const ageField = document.getElementById('age');
    const age = parseInt(ageField.value);
    if (age < 1 || age > 150) {
        showFieldError(ageField, 'Please enter a valid age');
        isValid = false;
    }

    return isValid;
}

/**
 * Validate a single field
 */
function validateField(field) {
    if (!field) return false;
    
    const errorSpan = field.parentElement.querySelector('.error-message');
    
    // Check if required field is empty
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Validate Indian phone number format
    if (field.type === 'tel' && field.value && !isValidPhoneNumber(field.value)) {
        showFieldError(field, 'Please enter a valid Indian phone number (10 digits, or +91-XXXXXXXXXX)');
        return false;
    }
    
    // Clear error if valid
    if (errorSpan) {
        errorSpan.classList.add('hidden');
    }
    field.classList.remove('border-red-500');
    field.classList.add('border-green-500');
    
    return true;
}

/**
 * Show error message for a field
 */
function showFieldError(field, message) {
    const errorSpan = field.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.textContent = message;
        errorSpan.classList.remove('hidden');
    }
    field.classList.add('border-red-500');
    field.classList.remove('border-green-500');
}

/**
 * Validate Indian phone number format
 * Accepts: +91-XXXXXXXXXX, +91 XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX (10 digits)
 */
function isValidPhoneNumber(phone) {
    if (!phone || !phone.trim()) return false;
    
    // Remove all spaces, dashes, and parentheses for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Indian phone number patterns:
    // +91 followed by 10 digits
    // 0 followed by 10 digits (landline/mobile)
    // 10 digits directly (mobile)
    const indianPhoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
    
    // Check if it matches Indian phone number pattern
    if (!indianPhoneRegex.test(cleanPhone)) {
        return false;
    }
    
    // Extract only digits
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    
    // Must have exactly 10 digits (excluding country code)
    // If starts with +91, should have 12 digits total (91 + 10)
    // If starts with 0, should have 11 digits total (0 + 10)
    // Otherwise should be exactly 10 digits
    if (cleanPhone.startsWith('+91')) {
        return digitsOnly.length === 12; // +91 (2) + 10 digits
    } else if (cleanPhone.startsWith('0')) {
        return digitsOnly.length === 11; // 0 + 10 digits
    } else {
        return digitsOnly.length === 10; // Just 10 digits
    }
}

/**
 * Collect form data into an object
 */
function collectFormData() {
    const form = document.getElementById('emergencyForm');
    const formData = new FormData(form);
    
    // Collect chronic diseases checkboxes
    const chronicDiseases = Array.from(
        document.querySelectorAll('input[name="chronicDiseases"]:checked')
    ).map(cb => cb.value);

    return {
        fullName: formData.get('fullName'),
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        bloodGroup: formData.get('bloodGroup'),
        // Chronic diseases (checkboxes)
        chronicDiseases: chronicDiseases,
        // Sensitive medical information
        allergies: formData.get('allergies') || 'None',
        medicalConditions: formData.get('medicalConditions') || 'None',
        medications: formData.get('medications') || 'None',
        knownTriggers: formData.get('knownTriggers') || '',
        // Doctor & Hospital
        doctorName: formData.get('doctorName') || '',
        doctorPhone: formData.get('doctorPhone') || '',
        preferredHospital: formData.get('preferredHospital') || '',
        insuranceProvider: formData.get('insuranceProvider') || '',
        insurancePolicyNumber: formData.get('insurancePolicyNumber') || '',
        governmentIdNumber: formData.get('governmentIdNumber') || '',
        dietaryRestrictions: formData.get('dietaryRestrictions') || '',
        // Emergency contacts — primary (index 0) + additional (indices 1-3)
        emergencyContactName:   (document.getElementById('contactName_0')  || {}).value || '',
        emergencyContactNumber: (document.getElementById('contactPhone_0') || {}).value || '',
        additionalEmergencyContacts: (() => {
            const result = [];
            const items = document.querySelectorAll('#contactList > div');
            items.forEach((item, idx) => {
                if (idx === 0) return; // primary already captured above
                const name  = (item.querySelector('input[type="text"]') || {}).value || '';
                const phone = (item.querySelector('input[type="tel"]')  || {}).value || '';
                if (phone.trim()) result.push({ name: name.trim(), phone: phone.trim() });
            });
            return result;
        })(),
        // Additional fields (optional)
        organDonor: formData.get('organDonor') === 'on' || false,
        address: formData.get('address') || '',
        city: formData.get('city') || '',
        state: formData.get('state') || '',
        notes: formData.get('notes') || '',
        createdAt: new Date().toISOString()
    };
}

/**
 * Create profile via backend API
 */
async function createProfileAPI(formData) {
    try {
        // Get auth token if user is logged in
        const token = localStorage.getItem('ice_token');
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(API_ENDPOINTS.CREATE_PROFILE, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
                throw new Error(errorMessages);
            }
            throw new Error(data.error || 'Failed to create profile');
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to create profile');
        }

        return data.data; // Returns { profileId, qrCode, emergencyURL, profile }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

