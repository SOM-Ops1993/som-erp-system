@echo off
title SOM ERP - Starting System
color 0A
echo.
echo =====================================================
echo   SOM ERP - QR Inventory System
echo   Starting up...
echo =====================================================
echo.

REM Start backend in a new window
echo Starting the server (backend)...
start "SOM ERP - Server" cmd /k "cd /d %~dp0backend && node src/server.js"

echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo Starting the website (frontend)...
start "SOM ERP - Website" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting 5 seconds for website to start...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:5173

echo.
echo =====================================================
echo   SOM ERP is now RUNNING!
echo.
echo   Open your browser and go to:
echo      http://localhost:5173
echo.
echo   To STOP the system:
echo      Close the two black windows titled
echo      "SOM ERP - Server" and "SOM ERP - Website"
echo =====================================================
echo.
pause
