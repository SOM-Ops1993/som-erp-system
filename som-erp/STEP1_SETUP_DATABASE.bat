@echo off
title SOM ERP - Step 1: Database Setup
color 0A
echo.
echo =====================================================
echo   SOM ERP - QR Inventory System
echo   STEP 1: Setting up the Database
echo =====================================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] PostgreSQL is NOT installed on this computer.
    echo.
    echo Please do the following:
    echo  1. Open your browser
    echo  2. Go to: https://www.postgresql.org/download/windows/
    echo  3. Click "Download the installer"
    echo  4. Download version 16
    echo  5. Run the installer - use these settings:
    echo       Password: SomErp2026!
    echo       Port: 5432 (default - don't change)
    echo  6. After installation is complete, run this file again
    echo.
    pause
    exit /b 1
)

echo [OK] PostgreSQL is installed!
echo.
echo Creating the SOM ERP database...
echo.

REM Create database and user
set PGPASSWORD=SomErp2026!
psql -U postgres -c "CREATE DATABASE som_erp;" 2>nul
psql -U postgres -c "CREATE USER som_user WITH PASSWORD 'SomErp2026!';" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE som_erp TO som_user;" 2>nul
psql -U postgres -d som_erp -c "GRANT ALL ON SCHEMA public TO som_user;" 2>nul

echo.
echo [OK] Database created successfully!
echo.
echo =====================================================
echo   Step 1 COMPLETE!
echo   Now run: STEP2_INSTALL_BACKEND.bat
echo =====================================================
echo.
pause
