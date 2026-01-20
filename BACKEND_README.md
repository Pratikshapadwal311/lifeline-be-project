# ICE Backend - Setup Guide

Complete backend implementation for ICE (In Case of Emergency) QR-based medical information application.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn**

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `MONGODB_URI` - Your MongoDB connection string
   - `PORT` - Server port (default: 3000)
   - `BASE_URL` - Your application base URL
   - `FRONTEND_URL` - Frontend URL for CORS

3. **Start MongoDB:**
   - **Local MongoDB:** Make sure MongoDB is running on your system
   - **MongoDB Atlas:** Use your connection string in `.env`

4. **Run the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Verify server is running:**
   - Open: `http://localhost:3000/health`
   - Should return: `{"status":"OK","message":"ICE Backend is running"}`

## 📁 Project Structure

```
backend/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env.example              # Environment variables template
│
├── models/
│   └── Profile.js           # Mongoose schema for profiles
│
├── controllers/
│   ├── profileController.js # Profile CRUD operations
│   └── emergencyController.js # Emergency info access
│
├── routes/
│   ├── profileRoutes.js     # Profile API routes
│   └── emergencyRoutes.js   # Emergency public routes
│
├── middleware/
│   ├── errorHandler.js      # Centralized error handling
│   └── validator.js         # Input validation & sanitization
│
└── utils/
    └── qrGenerator.js       # QR code generation utilities
```

## 🔌 API Endpoints

### Profile Management

#### `POST /api/profile`
Create a new emergency profile.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "age": 30,
  "gender": "Male",
  "bloodGroup": "O+",
  "allergies": "Penicillin, Peanuts",
  "medicalConditions": "Diabetes Type 2",
  "medications": "Metformin 500mg twice daily",
  "emergencyContactName": "Jane Doe",
  "emergencyContactNumber": "+1 (555) 123-4567",
  "notes": "Additional medical notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile created successfully",
  "data": {
    "profileId": "uuid-here",
    "qrCode": "data:image/png;base64,...",
    "emergencyURL": "http://localhost:3000/emergency/uuid-here",
    "profile": {
      "fullName": "John Doe",
      "createdAt": "2024-01-10T..."
    }
  }
}
```

#### `GET /api/profile/:id`
Get full profile details (internal use).

**Response:**
```json
{
  "success": true,
  "data": {
    "uniqueId": "uuid-here",
    "fullName": "John Doe",
    // ... all profile fields
  }
}
```

#### `PUT /api/profile/:id`
Update profile by ID.

**Request Body:** Same as POST, but all fields optional.

**Response:** Same as POST.

### Emergency Access (Public)

#### `GET /emergency/:id`
Get emergency information (public, no authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "fullName": "John Doe",
    "age": 30,
    "gender": "Male",
    "bloodGroup": "O+",
    "allergies": "Penicillin, Peanuts",
    "medicalConditions": "Diabetes Type 2",
    "medications": "Metformin 500mg twice daily",
    "emergencyContactName": "Jane Doe",
    "emergencyContactNumber": "+1 (555) 123-4567",
    "notes": "Additional medical notes"
  }
}
```

## 🔒 Security Features

- **Input Validation:** All inputs validated and sanitized
- **CORS:** Configured for frontend access
- **Rate Limiting:** 
  - Emergency endpoint: 100 requests/15min per IP
  - API endpoints: 50 requests/15min per IP
- **Helmet:** Security headers enabled
- **Error Handling:** Centralized error handling with meaningful messages

## 🗄️ Database Schema

### Profile Model

```javascript
{
  uniqueId: String (UUID, unique, indexed),
  fullName: String (required),
  dateOfBirth: Date (optional),
  age: Number (0-150),
  gender: Enum ['Male', 'Female', 'Other', 'Prefer not to say'],
  bloodGroup: Enum ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
  allergies: String (max 500 chars),
  medicalConditions: String (max 1000 chars),
  medications: String (max 1000 chars),
  emergencyContactName: String (required),
  emergencyContactNumber: String (required, validated),
  notes: String (max 2000 chars),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ice-db` |
| `BASE_URL` | Application base URL | `http://localhost:3000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:8000` |

## 🧪 Testing

### Manual Testing

1. **Create Profile:**
   ```bash
   curl -X POST http://localhost:3000/api/profile \
     -H "Content-Type: application/json" \
     -d '{
       "fullName": "Test User",
       "age": 25,
       "bloodGroup": "O+",
       "emergencyContactName": "Emergency Contact",
       "emergencyContactNumber": "1234567890"
     }'
   ```

2. **Get Emergency Info:**
   ```bash
   curl http://localhost:3000/emergency/{profileId}
   ```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- **Error:** "MongoDB connection error"
- **Solution:** 
  - Check if MongoDB is running: `mongod --version`
  - Verify connection string in `.env`
  - For MongoDB Atlas, check network access settings

### CORS Errors

- **Error:** "CORS policy blocked"
- **Solution:** Update `FRONTEND_URL` in `.env` to match your frontend URL

### Port Already in Use

- **Error:** "Port 3000 already in use"
- **Solution:** Change `PORT` in `.env` or kill the process using port 3000

## 📝 Notes

- QR codes are generated server-side for better reliability
- Emergency endpoint is public (no authentication) for quick access
- All sensitive data is sanitized before storage
- Rate limiting prevents abuse of public endpoints

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production` in `.env`
2. Use MongoDB Atlas or secure MongoDB instance
3. Update `BASE_URL` to production domain
4. Update `FRONTEND_URL` for CORS
5. Enable HTTPS
6. Set up proper logging
7. Configure backup strategy for MongoDB

### Recommended Hosting

- **Backend:** Heroku, Railway, Render, AWS, DigitalOcean
- **Database:** MongoDB Atlas (recommended)
- **Frontend:** Netlify, Vercel, or same server

## 📄 License

This project is provided as-is for demonstration purposes.
