# Mobile Phone "Site Can't Be Reached" - Complete Fix Guide

## Problem
Android phone shows "This site can't be reached" when scanning QR code.

## Root Cause
Windows Firewall is blocking port 3000 from external devices (like your phone).

---

## ✅ SOLUTION: Allow Port 3000 in Windows Firewall

### Method 1: PowerShell (Fastest) ⚡

1. **Right-click on PowerShell** → **Run as Administrator**
   - Search "PowerShell" in Start menu
   - Right-click → "Run as Administrator"
   - Click "Yes" when prompted

2. **Run this command:**
   ```powershell
   netsh advfirewall firewall add rule name="ICE Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
   ```

3. **You should see:** `Ok.`

4. **Wait 10-15 seconds** for the rule to apply

### Method 2: Windows Firewall GUI (Visual)

1. Press `Windows Key + R`
2. Type: `wf.msc` and press Enter
3. Click **"Inbound Rules"** on the left sidebar
4. Click **"New Rule..."** on the right sidebar
5. Select **"Port"** → Click **Next**
6. Select **"TCP"** → Enter **3000** in "Specific local ports" → Click **Next**
7. Select **"Allow the connection"** → Click **Next**
8. Check all three boxes:
   - ✅ Domain
   - ✅ Private  
   - ✅ Public
   → Click **Next**
9. Name it: **"ICE Backend Port 3000"** → Click **Finish**

---

## 🧪 TEST THE CONNECTION

### Test 1: On Your Phone Browser

1. Make sure phone is on **same WiFi network** as computer
2. Open browser on phone
3. Type in address bar: `http://172.26.176.1:3000/health`
4. You should see: `{"status":"OK","message":"ICE Backend is running"}`

✅ **If this works** → QR code will work too!
❌ **If this doesn't work** → Continue troubleshooting below

### Test 2: Verify Server is Running

On your computer, check if you see:
```
🚀 ICE Backend Server running on port 3000
📲 Network access: http://172.26.176.1:3000/health
```

---

## 🔧 TROUBLESHOOTING

### Issue 1: Still Can't Connect After Firewall Rule

**Check 1: Wait Time**
- Firewall rules can take 10-30 seconds to apply
- Try again after waiting

**Check 2: Verify Rule Was Added**
- Open Windows Firewall (`wf.msc`)
- Go to "Inbound Rules"
- Look for "ICE Backend Port 3000"
- Make sure it shows "Enabled" and "Allow"

**Check 3: Restart Server**
- Stop the server (Ctrl+C in terminal)
- Start again: `npm start`
- Check the network IP shown

### Issue 2: Phone and Computer on Different Networks

**Symptoms:**
- Phone shows "connection timeout"
- Can't reach the IP address

**Solution:**
1. **Check WiFi Network:**
   - Computer WiFi name: Check in Windows network settings
   - Phone WiFi name: Check in phone settings
   - **They must match exactly!**

2. **Check IP Address:**
   - On computer, run: `ipconfig`
   - Look for "IPv4 Address" under your WiFi adapter
   - Make sure it's `172.26.176.1` (or update QR code)

### Issue 3: Router Blocking Device-to-Device Communication

**Some routers have "AP Isolation" or "Client Isolation" enabled**

**Check Router Settings:**
1. Access router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Look for "AP Isolation", "Client Isolation", or "Wireless Isolation"
3. **Disable it** if enabled
4. Save and restart router

### Issue 4: Antivirus Firewall

**Some antivirus software has its own firewall:**

1. Check your antivirus settings
2. Look for "Firewall" or "Network Protection"
3. Add exception for port 3000
4. Or temporarily disable to test

### Issue 5: Windows Defender Firewall Still Blocking

**Try temporarily disabling to test:**

1. Press `Windows Key + R`
2. Type: `firewall.cpl`
3. Click "Turn Windows Defender Firewall on or off"
4. Turn off for **Private networks** (temporarily)
5. Test QR code scanning
6. **Re-enable immediately after testing!**

---

## 📱 CREATE NEW QR CODE

**Important:** Old QR codes still have `localhost` in them.

After fixing firewall:

1. Go to: `http://localhost:8000/register.html`
2. Create a **NEW profile**
3. The new QR code will have the network IP
4. Scan the new QR code with your phone

---

## ✅ VERIFICATION CHECKLIST

- [ ] Firewall rule added for port 3000
- [ ] Server is running and shows network IP
- [ ] Phone and computer on same WiFi network
- [ ] Can access `http://172.26.176.1:3000/health` from phone browser
- [ ] Created new profile after firewall fix
- [ ] QR code scanned successfully

---

## 🆘 STILL NOT WORKING?

### Alternative Solution: Use ngrok (Public URL)

If firewall issues persist, use ngrok to create a public URL:

1. **Install ngrok:** https://ngrok.com/download
2. **Run:** `ngrok http 3000`
3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)
4. **Update `.env` file:**
   ```
   BASE_URL=https://abc123.ngrok.io
   ```
5. **Restart server**
6. **Create new profile** - QR code will use ngrok URL

This bypasses all firewall issues but requires internet connection.

---

## 📞 Need More Help?

Check these files:
- `FIREWALL_FIX.md` - Detailed firewall instructions
- `SETUP.md` - General setup guide
- `BACKEND_README.md` - Backend documentation
