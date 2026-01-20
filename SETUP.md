# ICE - Complete Setup Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

1. Copy the environment template:
   ```bash
   copy .env.example .env
   ```
   (On Windows PowerShell, use: `Copy-Item .env.example .env`)

2. Edit `.env` file:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/ice-db
   BASE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:8000
   ```

### Step 3: Start MongoDB

**Option A: Local MongoDB**
- Make sure MongoDB is installed and running
- Default connection: `mongodb://localhost:27017/ice-db`

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Get connection string
- Update `MONGODB_URI` in `.env`

### Step 4: Start Backend Server

```bash
# Development mode (auto-reload)
npm run dev

# OR Production mode
npm start
```

Server will start on: `http://localhost:3000`

### Step 5: Start Frontend (Optional - for development)

In a **new terminal window**:

```bash
# Using Python
python -m http.server 8000

# OR using Node.js http-server
npx http-server -p 8000
```

Frontend will be available at: `http://localhost:8000`

## ✅ Verify Installation

1. **Backend Health Check:**
   - Open: http://localhost:3000/health
   - Should see: `{"status":"OK","message":"ICE Backend is running"}`

2. **Frontend:**
   - Open: http://localhost:8000
   - Should see the ICE landing page

## 🔧 Troubleshooting

### MongoDB Connection Error

**Problem:** `MongoDB connection error`

**Solutions:**
- Check if MongoDB is running: `mongod --version`
- Verify connection string in `.env`
- For MongoDB Atlas: Check network access settings

### Port Already in Use

**Problem:** `Port 3000 already in use`

**Solutions:**
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or kill the process: 
  - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
  - Mac/Linux: `lsof -ti:3000 | xargs kill`

### CORS Errors

**Problem:** Frontend can't connect to backend

**Solutions:**
- Make sure `FRONTEND_URL` in `.env` matches your frontend URL
- Check that backend is running on correct port
- Verify `API_BASE_URL` in `js/config.js` matches backend URL

## 📱 Testing the Application

1. **Create a Profile:**
   - Go to: http://localhost:8000/register.html
   - Fill in the form
   - Submit to create profile

2. **View QR Code:**
   - After creating profile, you'll be redirected to QR page
   - QR code should be displayed
   - Test download and print functions

3. **Access Emergency Info:**
   - Scan QR code or visit emergency URL
   - Should display emergency information

## 🚀 Production Deployment

See `BACKEND_README.md` for detailed deployment instructions.

## 📚 File Structure

```
lifeline/
├── server.js              # Backend server
├── package.json           # Dependencies
├── .env                   # Environment config (create from .env.example)
│
├── models/                # Database models
├── controllers/           # Business logic
├── routes/                # API routes
├── middleware/            # Express middleware
├── utils/                 # Utility functions
│
├── index.html             # Landing page
├── register.html          # Profile creation
├── qr.html               # QR code display
├── emergency.html        # Emergency info display
├── css/                  # Styles
└── js/                   # Frontend JavaScript
```

## 🆘 Need Help?

- Check `BACKEND_README.md` for API documentation
- Check browser console for JavaScript errors
- Check terminal for backend errors
- Verify all environment variables are set correctly
