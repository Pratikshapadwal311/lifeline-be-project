/**
 * QR Code Generator Utility
 * Generates QR codes for emergency profile URLs
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate QR code as data URL (base64)
 * @param {string} url - The URL to encode in QR code
 * @param {object} options - QR code options
 * @returns {Promise<string>} - Base64 data URL
 */
async function generateQRCodeDataURL(url, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'H', // High error correction for reliability
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    const dataURL = await QRCode.toDataURL(url, qrOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for file storage)
 * @param {string} url - The URL to encode in QR code
 * @param {object} options - QR code options
 * @returns {Promise<Buffer>} - PNG buffer
 */
async function generateQRCodeBuffer(url, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    const buffer = await QRCode.toBuffer(url, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code SVG string
 * @param {string} url - The URL to encode in QR code
 * @param {object} options - QR code options
 * @returns {Promise<string>} - SVG string
 */
async function generateQRCodeSVG(url, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    const svg = await QRCode.toString(url, qrOptions);
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate emergency profile URL
 * @param {string} uniqueId - Profile unique ID
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} - Full emergency URL
 */
function generateEmergencyURL(uniqueId, baseUrl) {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/emergency/${uniqueId}`;
}

module.exports = {
  generateQRCodeDataURL,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  generateEmergencyURL
};
