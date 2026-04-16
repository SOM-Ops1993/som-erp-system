@echo off
title SOM ERP - Step 3: Install Frontend
color 0A
echo.
echo =====================================================
echo   SOM ERP - QR Inventory System
echo   STEP 3: Installing Frontend (Website)
echo =====================================================
echo.
echo Installing website packages (this takes 1-2 minutes)...
echo Please wait - do not close this window
echo.

cd frontend
call npm install

if %errorlevel% NEQ 0 (
    echo [ERROR] Package installation failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   Step 3 COMPLETE!
echo.
echo   ALL SETUP IS DONE!
echo.
echo   To START the system every day, run:
echo      START_SOM_ERP.bat
echo =====================================================
echo.
cd ..
pause
