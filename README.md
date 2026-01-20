# ICE – In Case of Emergency

A QR-based medical information web application that allows users to store emergency medical details and access them instantly via QR code.

## Features

- **Create Emergency Profile**: Store critical medical information including allergies, conditions, medications, and emergency contacts
- **QR Code Generation**: Generate a unique QR code linked to your emergency profile
- **Emergency Access**: First responders can quickly scan QR codes to access vital health information
- **Fully Responsive**: Works seamlessly on mobile and desktop devices
- **Accessibility-Friendly**: Large text, clear contrast, and keyboard navigation support

## Project Structure

```
lifeline/
├── index.html          # Landing page
├── register.html       # Profile creation form
├── qr.html            # QR code display and download
├── emergency.html     # Emergency information display (public access)
├── css/
│   └── style.css      # Custom styles and responsive design
├── js/
│   ├── main.js        # General navigation and utilities
│   ├── register.js    # Form validation and submission
│   ├── qr.js          # QR code generation and download
│   └── emergency.js   # Emergency info display logic
└── README.md          # This file
```

## Pages Overview

### 1. Landing Page (index.html)
- Project introduction and description
- "Create Emergency Profile" button
- "How It Works" section
- Features overview

### 2. Create Profile Page (register.html)
- Form to collect:
  - Personal information (name, age, gender, blood group)
  - Medical information (allergies, conditions, medications)
  - Emergency contact details
- Client-side validation
- Form submission handling

### 3. QR Code Page (qr.html)
- Displays generated QR code
- Download QR code as PNG
- Print QR code functionality
- Edit profile link
- Copy profile link to clipboard

### 4. Emergency Info Page (emergency.html)
- Public access (no login required)
- Displays emergency information clearly:
  - Name (large, prominent)
  - Blood group (highlighted)
  - Allergies (warning color)
  - Medical conditions
  - Current medications
  - Emergency contact with click-to-call

## Technology Stack

- **HTML5**: Semantic markup
- **Tailwind CSS**: Modern, responsive styling via CDN
- **Vanilla JavaScript**: No frameworks, pure JS
- **QRCode.js**: QR code generation library (via CDN)
- **Font Awesome**: Icons (via CDN)

## Usage

1. Open `index.html` in a web browser
2. Click "Create Emergency Profile" to fill in your medical information
3. Submit the form to generate your QR code
4. Download or print your QR code
5. Keep the QR code accessible (wallet, phone, medical ID bracelet)

## Current Implementation

### Data Storage
Currently, the application uses **localStorage** to store profile data. This is a placeholder for backend integration.

### API Simulation
The form submission simulates an API call with a delay. Replace the `simulateAPICall()` function in `js/register.js` with actual backend API calls.

### Profile URLs
Profile URLs are generated using the current domain and profile ID. Update the URL generation in `js/qr.js` to match your backend routing.

## Backend Integration

To integrate with a Node.js + Express backend:

1. **Replace localStorage with API calls**:
   - Update `js/register.js` to POST to `/api/profiles`
   - Update `js/qr.js` to GET from `/api/profiles/:id`
   - Update `js/emergency.js` to GET from `/api/profiles/:id`

2. **Update profile URLs**:
   - Change `profileUrl` generation in `js/qr.js` to use your backend URL
   - Ensure your backend serves `emergency.html` with profile data

3. **Add authentication** (optional):
   - Implement login/signup pages
   - Add authentication tokens to API requests
   - Protect profile editing routes

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Requires localStorage support

## Accessibility

- WCAG 2.1 AA compliant color contrast
- Keyboard navigation support
- Screen reader friendly
- Large, readable fonts
- Clear focus indicators

## Future Enhancements

- Backend API integration
- User authentication
- Multiple emergency contacts
- Medical document uploads
- Profile sharing options
- Analytics and usage tracking

## License

This project is provided as-is for demonstration purposes.

## Emergency Notice

**For life-threatening emergencies, call 911 immediately.** This application is a tool to assist first responders and should not replace immediate emergency medical care.

