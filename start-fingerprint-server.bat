@echo off
REM Start Fingerprint Server on Windows Server
echo ===========================================
echo   Starting Fingerprint Server on Windows Server
echo   IP: 100.110.180.13 (Tailscale)
echo   Domain: www.2pheenong.com
echo ===========================================

echo.
echo Starting Fingerprint Image Server on port 8891...
echo.

REM Create fingerprint images directory if not exists
if not exist "public\uploads\fingerprints" mkdir "public\uploads\fingerprints"

REM Start the fingerprint server
node fingerprint-server.js

pause