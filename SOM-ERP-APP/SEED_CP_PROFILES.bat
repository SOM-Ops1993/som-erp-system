@echo off
echo ================================================
echo   SOM ERP - Seed Customer-Product Profiles
echo   from Excel (ERP Autofill Lookup sheet)
echo ================================================
echo.
echo This will load 2,124 customer-product profiles
echo covering packing details, label types, and unit
echo sizes for 379 customers.
echo.
echo Existing records are NOT overwritten — only gaps
echo are filled. Safe to run multiple times.
echo.
pause

cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: .env not found in backend folder.
    pause
    exit /b 1
)

echo Running seed…
node --experimental-vm-modules src/seeds/seed-cp-profiles.js

echo.
echo ================================================
echo   Done! Customer-product memory is now loaded.
echo   Restart the ERP backend to pick up changes.
echo ================================================
pause
