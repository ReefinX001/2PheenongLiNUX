@echo off
REM ============================================================
REM uTrust 2700 R Smart Card Reader - Windows Service Installer
REM 2 Pheenong Mobile Co., Ltd.
REM ============================================================

setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo uTrust 2700 R Smart Card Reader - Windows Service Installer
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
    echo Please:
    echo   1. Download and install Node.js from https://nodejs.org
    echo   2. Restart Command Prompt
    echo   3. Try again
    echo.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1" %%v in ('node --version') do set NODE_VERSION=%%v
echo [INFO] Node.js Version: %NODE_VERSION%

REM Check if npm is available
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm is not available
    echo Please reinstall Node.js and try again
    pause
    exit /b 1
)

echo [INFO] npm is available ✓

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please ensure you are running this from the correct directory
    pause
    exit /b 1
)

echo [INFO] package.json found ✓

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo.
    npm install
    if !errorLevel! neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed ✓
) else (
    echo [INFO] Dependencies already installed ✓
)

REM Check if node-windows is installed
if not exist "node_modules\node-windows" (
    echo [ERROR] node-windows package not found
    echo Running npm install to fix...
    npm install
    if !errorLevel! neq 0 (
        echo [ERROR] Failed to install node-windows
        pause
        exit /b 1
    )
)

echo [INFO] node-windows package found ✓
echo.

REM Install the Windows Service
echo [INFO] Installing Windows Service...
echo.
npm run install-service
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Service installation failed
    echo Check the logs for more details
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Service Installation Complete!
echo ============================================================
echo.
echo Next Steps:
echo   1. Start the service:        npm run start-service
echo   2. Check service status:     npm run service-status
echo   3. Open Services Manager:    services.msc
echo   4. Test the API:            http://localhost:3999/health
echo.
echo Service Management Commands:
echo   npm run start-service      # Start the service
echo   npm run stop-service       # Stop the service
echo   npm run restart-service    # Restart the service
echo   npm run service-status     # Check service status
echo   npm run uninstall-service  # Uninstall the service
echo.
echo The service is configured to start automatically with Windows.
echo You can also manage it through Windows Services Manager (services.msc).
echo.
echo ============================================================

pause 