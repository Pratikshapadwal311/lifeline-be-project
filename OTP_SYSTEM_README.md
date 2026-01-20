# OTP-Based Access Control System

## Overview

The ICE application now includes OTP-based access control for sensitive medical information. This ensures privacy while still allowing emergency responders to access critical basic information immediately.

## Security Architecture

### Data Classification

**Basic Information (Always Visible):**
- Full Name
- Age
- Gender
- Blood Group
- Emergency Contact Name
- Emergency Contact Number

**Sensitive Information (OTP Protected):**
- Allergies
- Medical Conditions
- Current Medications
- Organ Donor Status
- Address, City, State
- Photo URL
- Additional Notes

### OTP System

- **OTP Length:** 6 digits
- **Expiry Time:** 5 minutes
- **Single-Use:** OTP is cleared after successful verification
- **Rate Limiting:** 
  - OTP Requests: 3 per 15 minutes per IP
  - OTP Verification: 5 attempts per 15 minutes per IP

## API Endpoints

### 1. GET /emergency/:id
**Public endpoint** - No authentication required

**Response:**
- Basic emergency information (name, blood group, emergency contact)
- OTP request button (if sensitive data exists)
- QR scan is logged and owner is notified

### 2. POST /api/request-otp/:id
**Request OTP for sensitive data access**

**Request Body:**
```json
{
  "contact": "scanner@example.com" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "expiresIn": "5 minutes",
    "otp": "123456" // Only in development mode
  }
}
```

**Behavior:**
- Generates 6-digit OTP
- Stores OTP with 5-minute expiry
- Sends OTP to requester (console log in dev, SMS/Email in prod)
- Notifies QR owner about OTP request
- Rate limited to prevent abuse

### 3. POST /api/verify-otp/:id
**Verify OTP and get sensitive data**

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "medicalConditions": "...",
    "allergies": "...",
    "medications": "...",
    "organDonor": true,
    "address": "...",
    "city": "...",
    "state": "...",
    "photo_url": "...",
    "notes": "..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

**Behavior:**
- Validates OTP code and expiry
- Returns sensitive data if valid
- Clears OTP after verification (single-use)
- Rate limited to prevent brute force

## Database Schema Updates

### Profile Model - New Fields

```javascript
{
  // Sensitive Information
  organDonor: Boolean,
  address: String,
  city: String,
  state: String,
  photo_url: String,
  
  // Owner Notification
  ownerNotificationContact: String (email or phone),
  
  // QR Scan Tracking
  lastQrScan: {
    scannedAt: Date,
    scannedByDevice: String
  },
  
  // OTP System
  otp: {
    code: String (6 digits),
    expiresAt: Date,
    requestedAt: Date,
    requestedByDevice: String
  }
}
```

## User Flow

### 1. QR Code Scan
1. User scans QR code
2. Emergency page loads with **basic information only**
3. QR scan is logged
4. Owner receives notification (if contact provided)

### 2. Request Sensitive Data
1. User clicks "Request Access to Full Medical Info"
2. OTP is generated and sent
3. OTP input field appears
4. Owner receives notification about OTP request

### 3. Verify OTP
1. User enters 6-digit OTP
2. System validates OTP
3. If valid: Sensitive data is displayed
4. If invalid: Error message shown
5. OTP is cleared (single-use)

## Notification System

### Development Mode
- All notifications logged to console
- OTP codes visible in API response
- Easy for testing

### Production Mode
- Integrate with email service (SendGrid, AWS SES)
- Integrate with SMS service (Twilio, AWS SNS)
- OTP codes NOT included in API response

### Notification Types

1. **QR Scan Notification:**
   - "Your ICE QR code was scanned from [device] at [time]"

2. **OTP Request Notification:**
   - "OTP requested to access sensitive medical information from [device]"

## Security Features

### Privacy Protection
- ✅ Sensitive data never sent without OTP
- ✅ OTP expires automatically (5 minutes)
- ✅ Single-use OTP (cleared after verification)
- ✅ Rate limiting prevents abuse
- ✅ Input sanitization prevents injection
- ✅ HTML escaping prevents XSS

### Scan Tracking
- ✅ Every QR scan is logged
- ✅ Device information captured
- ✅ Timestamp recorded
- ✅ Owner notifications sent

## Frontend Integration

### Emergency Page UI

**Section 1: Basic Info (Always Visible)**
- Name (large, prominent)
- Blood Group (highlighted)
- Age & Gender
- Emergency Contact (with call button)

**Section 2: OTP Access (If Sensitive Data Exists)**
- Warning message about protected information
- "Request Access" button
- OTP input field (appears after request)
- Verify button

**Section 3: Sensitive Data (After OTP Verification)**
- Allergies (yellow warning)
- Medical Conditions (purple)
- Medications (green)
- Organ Donor Status (blue)
- Address Information (gray)
- Photo (if available)
- Additional Notes (blue)

## Testing

### Development Testing

1. **Create Profile:**
   ```
   POST /api/profile
   Include sensitive data: allergies, medicalConditions, medications, etc.
   ```

2. **Scan QR Code:**
   ```
   GET /emergency/:profileId
   Should show only basic info
   Check server console for scan notification
   ```

3. **Request OTP:**
   ```
   POST /api/request-otp/:profileId
   Check server console for OTP code
   ```

4. **Verify OTP:**
   ```
   POST /api/verify-otp/:profileId
   Body: { "otp": "123456" }
   Should return sensitive data
   ```

### Production Testing

1. Set up email/SMS service
2. Update notification functions in `utils/notifications.js`
3. Test OTP delivery
4. Verify notifications work

## Environment Variables

Add to `.env`:

```env
# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# Notification Services (for production)
EMAIL_SERVICE_API_KEY=your_key
SMS_SERVICE_API_KEY=your_key
```

## File Structure

```
controllers/
  ├── emergencyController.js  # Modified to show basic info only
  └── otpController.js         # New: OTP request & verification

routes/
  └── otpRoutes.js            # New: OTP routes with rate limiting

utils/
  ├── otpGenerator.js          # New: OTP generation & validation
  └── notifications.js         # New: Notification system

models/
  └── Profile.js               # Updated with new fields
```

## Security Best Practices

1. **Never expose OTP in production API responses**
2. **Use HTTPS in production**
3. **Implement proper email/SMS services**
4. **Monitor OTP request patterns for abuse**
5. **Consider IP-based blocking for repeated failures**
6. **Log all OTP attempts for audit**

## Future Enhancements

- [ ] Email/SMS service integration
- [ ] OTP delivery via multiple channels
- [ ] Audit log for all access attempts
- [ ] Auto-delete expired OTPs (cron job)
- [ ] IP-based blocking for abuse
- [ ] Two-factor authentication for profile owners
- [ ] Time-based access (e.g., 24-hour access after OTP)
