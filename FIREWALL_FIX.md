# Fix Windows Firewall for Mobile QR Code Access

## Problem
Android phone can't connect to `172.26.176.1:3000` - connection timeout error.

## Solution: Allow Port 3000 in Windows Firewall

### Method 1: Using PowerShell (Run as Administrator)

1. **Right-click on PowerShell** → **Run as Administrator**
2. Run this command:
   ```powershell
   netsh advfirewall firewall add rule name="ICE Backend" dir=in action=allow protocol=TCP localport=3000
   ```

### Method 2: Using Windows Firewall GUI

1. Press `Windows Key + R`
2. Type: `wf.msc` and press Enter
3. Click **Inbound Rules** on the left
4. Click **New Rule** on the right
5. Select **Port** → Click **Next**
6. Select **TCP** and enter port **3000** → Click **Next**
7. Select **Allow the connection** → Click **Next**
8. Check all profiles (Domain, Private, Public) → Click **Next**
9. Name it: **ICE Backend** → Click **Finish**

### Method 3: Quick Test (Temporarily Disable Firewall)

**⚠️ Only for testing! Re-enable after testing!**

1. Press `Windows Key + R`
2. Type: `firewall.cpl` and press Enter
3. Click **Turn Windows Defender Firewall on or off**
4. Turn off firewall for **Private networks** (temporarily)
5. Test QR code scanning
6. **Re-enable firewall** after testing

## Verify It's Working

After adding the firewall rule:

1. **Wait 10-15 seconds** for the rule to apply
2. Make sure your **phone is on the same WiFi network**
3. **Create a NEW profile** to get a QR code with the network IP
4. **Scan the QR code** with your Android phone

## Troubleshooting

### Still Not Working?

1. **Check Network Connection:**
   - Phone and computer must be on **same WiFi network**
   - Not on mobile data or different WiFi

2. **Verify IP Address:**
   - On your computer, run: `ipconfig`
   - Look for "IPv4 Address" under your WiFi adapter
   - Make sure it matches `172.26.176.1` (or update QR code URL)

3. **Test Connection:**
   - On your phone's browser, manually type: `http://172.26.176.1:3000/health`
   - Should show: `{"status":"OK","message":"ICE Backend is running"}`

4. **Check Antivirus:**
   - Some antivirus software also has a firewall
   - May need to allow port 3000 there too

5. **Router/Network Issues:**
   - Some routers block device-to-device communication
   - Check router settings for "AP Isolation" or "Client Isolation"
   - Disable it if enabled

## Alternative: Use ngrok for Public Access

If firewall issues persist, you can use ngrok to create a public URL:

1. Install ngrok: https://ngrok.com/
2. Run: `ngrok http 3000`
3. Use the ngrok URL in QR codes (update BASE_URL in .env)
