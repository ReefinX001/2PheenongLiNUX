@echo off
echo ========================================
echo Restarting Server and Testing Stock
echo ========================================
echo.

echo Step 1: Finding Node.js process...
for /f "tokens=2" %%a in ('tasklist ^| findstr "node.exe"') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Step 2: Waiting for processes to close...
timeout /t 3 /nobreak >nul

echo.
echo Step 3: Starting server...
start /B node server.js

echo.
echo Step 4: Waiting for server to start...
timeout /t 10 /nobreak >nul

echo.
echo Step 5: Testing stock status...
node check-current-stock.js

echo.
echo ========================================
echo Server restarted successfully!
echo ========================================
echo.
echo Test the system now - Stock should work correctly:
echo 1. Check stock (won't deduct)
echo 2. Create contract (will deduct)
echo.
pause