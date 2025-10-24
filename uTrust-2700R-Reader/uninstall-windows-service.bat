@echo off
REM ============================================================
REM uTrust 2700 R Smart Card Reader - Windows Service Uninstaller
REM 2 Pheenong Mobile Co., Ltd.
REM ============================================================

setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo uTrust 2700 R Smart Card Reader - Windows Service Uninstaller
echo 2 Pheenong Mobile Co., Ltd.
echo ============================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator
    echo.
    echo Please:
    echo   1. Right-click on this file
    echo   2. Select "Run as Administrator"
    echo   3. Try again
    echo.
    pause
    exit /b 1
)

echo [INFO] Running with Administrator privileges ✓
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo [INFO] Node.js is available ✓

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please ensure you are running this from the correct directory
    pause
    exit /b 1
)

echo [INFO] package.json found ✓
echo.

REM Confirm uninstallation
echo [WARNING] This will completely remove the uTrust 2700 R Smart Card Reader service
echo from Windows Services.
echo.
set /p CONFIRM="Are you sure you want to continue? (y/N): "
if /i not "%CONFIRM%"=="y" if /i not "%CONFIRM%"=="yes" (
    echo.
    echo [INFO] Uninstallation cancelled by user
    pause
    exit /b 0
)

echo.
echo [INFO] Uninstalling Windows Service...
echo.

REM Uninstall the Windows Service
npm run uninstall-service
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Service uninstallation failed
    echo.
    echo The service may still be running. Try:
    echo   1. Stop the service first: npm run stop-service
    echo   2. Wait a few seconds
    echo   3. Try uninstalling again
    echo   4. Or manually remove it from services.msc
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Service Uninstallation Complete!
echo ============================================================
echo.
echo The uTrust 2700 R Smart Card Reader service has been
echo completely removed from Windows Services.
echo.
echo If you want to reinstall the service later:
echo   install-windows-service.bat
echo.
echo Or use npm commands:
echo   npm run install-service
echo.
echo ============================================================

pause 