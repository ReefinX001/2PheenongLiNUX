@echo off
echo ========================================
echo  🚀 Multi-Branch Printer System
echo  Quick Start Script for Production
echo ========================================
echo.

:: ตรวจสอบ Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js ไม่ได้ติดตั้ง กรุณาติดตั้ง Node.js ก่อน
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

:: ตรวจสอบว่าอยู่ใน directory ที่ถูกต้อง
if not exist "package.json" (
    echo ❌ ไม่พบ package.json กรุณาเปิด Command Prompt ใน folder ที่ถูกต้อง
    echo    Expected path: D:\WEB\3\local-printer\printer-server\Server Web
    pause
    exit /b 1
)

echo ✅ Directory check passed
echo.

echo 🔧 เริ่มต้นการตั้งค่าระบบ...
echo.

:: ติดตั้ง dependencies (ถ้ายังไม่มี)
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ ติดตั้ง dependencies ไม่สำเร็จ
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

:: ตั้งค่าสาขาและเครื่องพิมพ์
echo 🏢 Setting up branches and printers...
node scripts/setup-production-branches.js setup
if errorlevel 1 (
    echo ⚠️  Branch setup ล้มเหลว - กรุณาตรวจสอบการเชื่อมต่อ MongoDB
    echo    คุณยังสามารถเริ่มระบบได้ แต่อาจต้องตั้งค่าสาขาเพิ่มเติม
    echo.
)

:: ทดสอบการเชื่อมต่อเครื่องพิมพ์
echo 🖨️  Testing printer connections...
node scripts/setup-production-branches.js test-printers
echo.

echo ========================================
echo  🎯 Production Checklist
echo ========================================
echo.
echo ก่อนใช้งานจริง กรุณาตรวจสอบ:
echo.
echo 📋 Database:
echo    • MongoDB connection ทำงานได้
echo    • ข้อมูลสาขาถูกต้อง
echo.
echo 🖨️  Printers:
echo    • เครื่องพิมพ์ทุกสาขาเชื่อมต่อแล้ว
echo    • Printer Server ทำงานที่ port 4001
echo    • IP Address ตั้งค่าใน database แล้ว
echo.
echo 👥 Users:
echo    • User accounts สร้างแล้ว
echo    • Branch permissions ตั้งค่าแล้ว
echo.
echo ========================================
echo  🚀 Starting Application...
echo ========================================
echo.
echo Application will start at: http://localhost:3000
echo POS System entry point: http://localhost:3000/views/frontstore_index.html
echo.
echo กด Ctrl+C เพื่อหยุดระบบ
echo.

:: เริ่มระบบ
npm start
