/**
 * Authentication — Email + Password
 */

document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

function checkAuthStatus() {
  const token = localStorage.getItem('ice_token');
  const user  = localStorage.getItem('ice_user');
  updateNavigation(!!(token && user));
  return !!(token && user);
}

function updateNavigation(isLoggedIn) {
  document.querySelectorAll('[data-auth]').forEach(item => {
    if (isLoggedIn) {
      item.classList.toggle('hidden', item.dataset.auth !== 'logged-in');
    } else {
      item.classList.toggle('hidden', item.dataset.auth !== 'logged-out');
    }
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage     = document.getElementById('errorMessage');
  const submitButton     = form.querySelector('button[type="submit"]');

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) { showError('Please fill in all fields'); return; }

  loadingIndicator.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  submitButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Login failed');

    localStorage.setItem('ice_token', data.data.token);
    localStorage.setItem('ice_user',  JSON.stringify(data.data.user));

    // Always fetch the user's profile from the server — don't rely on localStorage
    try {
      const profileRes = await fetch(`${API_BASE_URL}/api/profile/mine`, {
        headers: { 'Authorization': 'Bearer ' + data.data.token }
      });
      const profileData = await profileRes.json();
      if (profileData.success && profileData.data.profileId) {
        localStorage.setItem('ice_current_profile', profileData.data.profileId);
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'register.html';
      }
    } catch {
      // Network error — fall back to whatever is cached locally
      const profileId = localStorage.getItem('ice_current_profile');
      window.location.href = profileId ? 'dashboard.html' : 'register.html';
    }

  } catch (error) {
    showError(error.message || 'Login failed. Please try again.');
    loadingIndicator.classList.add('hidden');
    submitButton.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage     = document.getElementById('errorMessage');
  const submitButton     = form.querySelector('button[type="submit"]');

  const fullName        = document.getElementById('fullName').value.trim();
  const email           = document.getElementById('email').value.trim();
  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const terms           = document.getElementById('terms').checked;

  if (!fullName || !email || !password || !confirmPassword) { showError('Please fill in all fields'); return; }
  if (password.length < 6)           { showError('Password must be at least 6 characters'); return; }
  if (password !== confirmPassword)  { showError('Passwords do not match'); return; }
  if (!terms)                        { showError('Please agree to the terms and conditions'); return; }

  loadingIndicator.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  submitButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (data.errors && Array.isArray(data.errors)) {
        throw new Error(data.errors.map(e => e.msg || e.message).join(', '));
      }
      throw new Error(data.error || data.message || 'Registration failed');
    }

    localStorage.setItem('ice_token', data.data.token);
    localStorage.setItem('ice_user',  JSON.stringify(data.data.user));

    window.location.href = 'register.html';

  } catch (error) {
    showError(error.message || 'Registration failed. Please try again.');
    loadingIndicator.classList.add('hidden');
    submitButton.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('ice_token');
  localStorage.removeItem('ice_user');
  updateNavigation(false);
  window.location.href = 'index.html';
}

function getAuthToken()    { return localStorage.getItem('ice_token'); }
function getCurrentUser()  { const u = localStorage.getItem('ice_user'); return u ? JSON.parse(u) : null; }
function isAuthenticated() { return !!getAuthToken(); }

function showError(message) {
  const el = document.getElementById('errorMessage');
  if (el) {
    el.querySelector('p').textContent = message;
    el.classList.remove('hidden');
  } else {
    alert(message);
  }
}

function togglePassword() {
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const toggle = document.getElementById('passwordToggle');
  [passwordInput, confirmPasswordInput].filter(Boolean).forEach(input => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  if (toggle) {
    toggle.classList.toggle('fa-eye', passwordInput.type === 'password');
    toggle.classList.toggle('fa-eye-slash', passwordInput.type === 'text');
  }
}

window.ICE_Auth = { checkAuthStatus, logout, getAuthToken, getCurrentUser, isAuthenticated, updateNavigation };
