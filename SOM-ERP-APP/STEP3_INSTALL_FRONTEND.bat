@echo off
echo ==========================================
echo  SOM ERP v2 - Step 3: Install Frontend
echo ==========================================
echo.

cd /d "%~dp0frontend"
if %errorlevel% neq 0 (
    echo ERROR: Cannot find the frontend folder.
    pause
    exit /b 1
)

echo Installing packages...
call npm install
echo.
echo ==========================================
echo  Frontend setup COMPLETE!
echo ==========================================
echo.
pause
