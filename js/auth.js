/**
 * Authentication JavaScript
 * Handles user login, registration, and authentication state
 */

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    // Setup login form if it exists
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup registration form if it exists
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

/**
 * Check authentication status
 */
function checkAuthStatus() {
    const token = localStorage.getItem('ice_token');
    const user = localStorage.getItem('ice_user');
    
    if (token && user) {
        updateNavigation(true);
        return true;
    } else {
        updateNavigation(false);
        return false;
    }
}

/**
 * Update navigation based on auth status
 */
function updateNavigation(isLoggedIn) {
    // Update navigation items
    const navItems = document.querySelectorAll('[data-auth]');
    navItems.forEach(item => {
        if (isLoggedIn) {
            if (item.dataset.auth === 'logged-in') {
                item.classList.remove('hidden');
            } else if (item.dataset-auth === 'logged-out') {
                item.classList.add('hidden');
            }
        } else {
            if (item.dataset.auth === 'logged-in') {
                item.classList.add('hidden');
            } else if (item.dataset-auth === 'logged-out') {
                item.classList.remove('hidden');
            }
        }
    });
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get form data
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Show loading
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    submitButton.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || data.message || 'Login failed');
        }
        
        // Store token and user info
        localStorage.setItem('ice_token', data.data.token);
        localStorage.setItem('ice_user', JSON.stringify(data.data.user));
        
        // Redirect to dashboard or profile creation
        window.location.href = 'register.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please try again.');
        loadingIndicator.classList.add('hidden');
        submitButton.disabled = false;
    }
}

/**
 * Handle registration form submission
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get form data
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (!terms) {
        showError('Please agree to the terms and conditions');
        return;
    }
    
    // Show loading
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    submitButton.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fullName, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.msg || err.message).join(', ');
                throw new Error(errorMessages);
            }
            throw new Error(data.error || data.message || 'Registration failed');
        }
        
        // Store token and user info
        localStorage.setItem('ice_token', data.data.token);
        localStorage.setItem('ice_user', JSON.stringify(data.data.user));
        
        // Redirect to profile creation
        window.location.href = 'register.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'Registration failed. Please try again.');
        loadingIndicator.classList.add('hidden');
        submitButton.disabled = false;
    }
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('ice_token');
    localStorage.removeItem('ice_user');
    updateNavigation(false);
    window.location.href = 'index.html';
}

/**
 * Get authentication token
 */
function getAuthToken() {
    return localStorage.getItem('ice_token');
}

/**
 * Get current user
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('ice_user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Show error message
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.querySelector('p').textContent = message;
        errorMessage.classList.remove('hidden');
    } else {
        alert(message);
    }
}

/**
 * Toggle password visibility
 */
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const toggle = document.getElementById('passwordToggle');
    
    const inputs = [passwordInput, confirmPasswordInput].filter(input => input);
    
    inputs.forEach(input => {
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    });
    
    if (toggle) {
        if (passwordInput.type === 'text') {
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
        } else {
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
        }
    }
}

// Export for use in other files
window.ICE_Auth = {
    checkAuthStatus,
    logout,
    getAuthToken,
    getCurrentUser,
    isAuthenticated,
    updateNavigation
};
