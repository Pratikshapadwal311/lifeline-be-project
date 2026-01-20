/**
 * Main JavaScript file for ICE Application
 * Handles navigation and general functionality
 */

/**
 * Scroll to "How It Works" section smoothly
 */
function scrollToHowItWorks() {
    const section = document.getElementById('how-it-works');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('ICE Application loaded');
    
    // Add any global initialization code here
    // For example, checking if user is logged in, etc.
});

