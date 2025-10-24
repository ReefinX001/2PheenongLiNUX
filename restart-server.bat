@echo off
echo ========================================
echo Restarting Server to Load New Code
echo ========================================
echo.
echo Stopping current server (PID 22876)...
taskkill /F /PID 22876 2>nul
timeout /t 2 /nobreak >nul

echo Starting server with new code...
start /B node server.js

echo.
echo Server restarted! Waiting for it to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Testing stock check API...
curl -X POST http://127.0.0.1:3000/api/stock/check-after-sale -H "Content-Type: application/json" -d "{\"branch_code\":\"00000\",\"items\":[{\"product_id\":\"68721e7837da42f5e3682ac3\",\"quantity\":1,\"imei\":\"SL6H3FK3Q7T\"}]}"

echo.
echo ========================================
echo Server restart complete!
echo ========================================