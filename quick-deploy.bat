@echo off
echo ========================================
echo   QUICK DEPLOYMENT - Installment Fix
echo ========================================
echo.

echo [1/4] Creating commit with installment fixes...
git add controllers/installmentController.js server.js models/Installment*.js routes/installmentRoutes.js
git commit -m "Fix: Installment endpoint validation errors - Fixed InstallmentOrder model field requirements - Added proper customer reference and address fields - Fixed planType enum validation (custom -> manual) - Removed duplicate route declarations"

echo.
echo [2/4] Pushing to repository...
git push origin master

echo.
echo [3/4] Now you need to deploy to production server:
echo.
echo SSH into server:
echo   ssh root@www.2pheenong.com
echo.
echo Then run:
echo   cd /var/www/my-accounting-app
echo   git pull origin master
echo   pm2 restart all
echo.
echo [4/4] Test the endpoint:
echo   curl -X GET https://www.2pheenong.com/api/installment/test
echo.
echo ========================================
echo   Deployment script ready!
echo ========================================
pause