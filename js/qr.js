/**
 * QR Code Generation and Display JavaScript
 * Handles QR code creation, download, and print functionality
 */

let qrcodeInstance = null;
let profileData = null;
let profileId = null;
let profileUrl = null;

// Initialize QR code when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get profile ID from URL parameter or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    profileId = urlParams.get('profileId') || localStorage.getItem('ice_current_profile');
    
    if (!profileId) {
        // No profile found, redirect to registration
        alert('No profile found. Please create a profile first.');
        window.location.href = 'register.html';
        return;
    }
    
    // Load profile data
    loadProfileData();
});

/**
 * Load profile data from backend API
 */
async function loadProfileData() {
    try {
        // Fetch profile from backend
        const response = await fetch(API_ENDPOINTS.GET_PROFILE(profileId));
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Profile not found');
        }
        
        profileData = result.data;
        
        // Display user name
        document.getElementById('userName').textContent = profileData.fullName;
        
        // Get emergency URL from backend or construct it
        const baseUrl = API_BASE_URL;
        profileUrl = `${baseUrl}/emergency/${profileId}`;
        
        // Try to get QR code from localStorage (stored during registration)
        // Otherwise, generate it from the URL
        const storedQR = localStorage.getItem('ice_qr_' + profileId);
        
        if (storedQR) {
            // Display QR code from backend (stored during registration)
            displayQRCodeFromDataURL(storedQR);
        } else {
            // Generate QR code client-side as fallback
            generateQRCode(profileUrl);
        }
        
        // Display profile link
        document.getElementById('profileLink').textContent = profileUrl;
        
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Profile not found. Please create a new profile.');
        window.location.href = 'register.html';
    }
}

/**
 * Display QR code from data URL (from backend)
 */
function displayQRCodeFromDataURL(dataURL) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = 'ICE QR Code';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    qrcodeContainer.appendChild(img);
    
    // Store reference for download
    qrcodeInstance = { dataURL: dataURL };
}

/**
 * Generate QR code using qrcode.js library
 */
function generateQRCode(url) {
    const qrcodeContainer = document.getElementById('qrcode');
    
    // Clear any existing QR code
    qrcodeContainer.innerHTML = '';
    
    // Create QR code instance
    qrcodeInstance = new QRCode(qrcodeContainer, {
        text: url,
        width: 300,
        height: 300,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

/**
 * Download QR code as PNG image
 */
function downloadQRCode() {
    if (!qrcodeInstance && !qrcodeInstance?.dataURL) {
        // Try to get from canvas
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ICE_QR_${profileData.fullName.replace(/\s+/g, '_')}_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
            return;
        }
        alert('QR code not generated yet.');
        return;
    }
    
    // If we have a data URL from backend, use it directly
    if (qrcodeInstance?.dataURL) {
        const a = document.createElement('a');
        a.href = qrcodeInstance.dataURL;
        a.download = `ICE_QR_${profileData.fullName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }
    
    // Fallback to canvas method
    const canvas = document.querySelector('#qrcode canvas');
    if (canvas) {
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ICE_QR_${profileData.fullName.replace(/\s+/g, '_')}_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } else {
        alert('Unable to download QR code.');
    }
}

/**
 * Print QR code
 */
function printQRCode() {
    // Create a print-friendly window
    const printWindow = window.open('', '_blank');
    
    // Try to get QR code image
    let qrImage;
    
    // First, try data URL from backend
    if (qrcodeInstance?.dataURL) {
        qrImage = qrcodeInstance.dataURL;
    } else {
        // Fallback to canvas
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (!qrCanvas) {
            alert('Unable to print QR code.');
            return;
        }
        qrImage = qrCanvas.toDataURL('image/png');
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ICE QR Code - ${profileData.fullName}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .qr-container {
                    text-align: center;
                }
                .qr-code {
                    border: 4px solid #000;
                    padding: 20px;
                    background: white;
                    margin-bottom: 20px;
                }
                .name {
                    font-size: 24px;
                    font-weight: bold;
                    margin-top: 20px;
                }
                .instructions {
                    margin-top: 30px;
                    font-size: 14px;
                    color: #666;
                    max-width: 400px;
                }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <div class="qr-code">
                    <img src="${qrImage}" alt="ICE QR Code" style="max-width: 100%;">
                </div>
                <div class="name">${profileData.fullName}</div>
                <div class="instructions">
                    <p><strong>ICE - In Case of Emergency</strong></p>
                    <p>Scan this QR code to access emergency medical information.</p>
                    <p>Keep this code in your wallet, phone, or medical ID bracelet.</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Wait for image to load, then print
    printWindow.onload = function() {
        setTimeout(function() {
            printWindow.print();
        }, 250);
    };
}

/**
 * Copy profile link to clipboard
 */
function copyProfileLink() {
    if (!profileUrl) {
        alert('Profile URL not available.');
        return;
    }
    
    // Use Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(profileUrl).then(function() {
            showCopySuccess();
        }).catch(function(err) {
            console.error('Failed to copy:', err);
            fallbackCopyText(profileUrl);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyText(profileUrl);
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Unable to copy. Please copy manually: ' + text);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Show copy success message
 */
function showCopySuccess() {
    const successDiv = document.getElementById('copySuccess');
    successDiv.classList.remove('hidden');
    successDiv.classList.add('fade-in');
    
    setTimeout(function() {
        successDiv.classList.add('hidden');
    }, 3000);
}

