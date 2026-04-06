/**
 * Network Utilities
 * Get local network IP address for QR code generation
 */

const os = require('os');

/**
 * Get local network IP address
 * Returns the WiFi adapter IP if available, otherwise first non-internal IPv4 address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // First, try to find WiFi adapter (preferred for mobile access)
  for (const interfaceName in interfaces) {
    const name = interfaceName.toLowerCase();
    if (name.includes('wi-fi') || name.includes('wireless') || name.includes('wlan')) {
      const addresses = interfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
          return address.address;
        }
      }
    }
  }
  
  // If no WiFi found, get first non-internal IPv4 address
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      // Skip internal (loopback), link-local (169.254.x.x), and non-IPv4 addresses
      if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
        return address.address;
      }
    }
  }
  
  // Fallback to localhost if no network interface found
  return 'localhost';
}

/**
 * Get base URL for QR codes
 * Uses local IP in development, environment variable in production
 */
function getBaseURLForQR(port = 3000) {
  // Use BASE_URL from environment if set (works in any environment)
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // Fallback to local IP address
  const localIP = getLocalIP();
  return `http://${localIP}:${port}`;
}

module.exports = {
  getLocalIP,
  getBaseURLForQR
};
