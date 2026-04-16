@echo on
title SOM ERP - Step 2: Install Backend
color 0A
echo.
echo =====================================================
echo   SOM ERP - QR Inventory System
echo   STEP 2: Installing Backend (Server)
echo =====================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Node.js is NOT installed on this computer.
    echo.
    echo Please do the following:
    echo  1. Open your browser
    echo  2. Go to: https://nodejs.org
    echo  3. Click the big green button "Download Node.js (LTS)"
    echo  4. Run the downloaded installer (click Next, Next, Install)
    echo  5. After installation, CLOSE and RE-OPEN this window
    echo  6. Run this file again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed!
echo.
echo Now setting up the .env configuration file...

REM Create the .env file with the correct database settings
(
echo DATABASE_URL="postgresql://som_user:SomErp2026!@localhost:5432/som_erp"
echo PORT=3001
echo NODE_ENV=development
echo FRONTEND_URL="http://localhost:5173"
echo JWT_SECRET="SomErpSecretKey2026RandomString123456789"
) > backend\.env

echo [OK] Configuration file created!
echo.
echo Installing backend packages (this takes 1-2 minutes)...
echo Please wait - do not close this window
echo.

cd backend
call npm install

if where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js NOT found
    pause
    exit /b
) ELSE (
    echo [OK] Node.js is installed!
)%errorlevel% NEQ 0 (
    echo [ERROR] Package installation failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo Setting up database tables...
call npx prisma generate
call npx prisma migrate dev --name init

echo.
echo Applying database rules (immutability, triggers)...
set PGPASSWORD=SomErp2026!
psql -U som_user -d som_erp -f prisma\migrations\001_immutability_and_indexes.sql

echo.
echo =====================================================
echo   Step 2 COMPLETE!
echo   Now run: STEP3_INSTALL_FRONTEND.bat
echo =====================================================
echo.
cd ..
pause
