@echo off
REM ===================================================
REM uTrust 2700R Card Reader - Quick Start
REM สำหรับการใช้งานจริงประจำวัน
REM ===================================================

echo.
echo ===============================================
echo 🔒 uTrust 2700R Card Reader Service
echo ===============================================
echo.

REM Kill any existing node processes first
echo 🛑 หยุดโปรแกรมเก่าที่อาจรันอยู่...
taskkill /F /IM node.exe >nul 2>&1

echo ✅ พร้อมเริ่มต้นโปรแกรม
echo.

REM Start the card reader service
echo 🚀 เริ่มต้นเซิร์ฟิส อ่านบัตรประชาชน...
echo 📱 เปิดเบราว์เซอร์ไปที่: http://localhost:4001
echo 🔌 ตรวจสอบให้แน่ใจว่าเสียบเครื่องอ่านบัตรแล้ว
echo.
echo กดปุ่ม Ctrl+C เพื่อหยุดโปรแกรม
echo ===============================================
echo.

REM Start the server
node start-server.js

echo.
echo ===============================================
echo 👋 โปรแกรมหยุดทำงานแล้ว
echo ===============================================
pause 