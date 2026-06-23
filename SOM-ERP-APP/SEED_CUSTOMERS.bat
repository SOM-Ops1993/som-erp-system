@echo off
echo ============================================================
echo   SOM ERP — Seed 489 Customer Profiles into database
echo ============================================================
echo.
echo This loads historical customer data (name, company, order type)
echo so the Sales Order form can auto-fill when you type a name.
echo.

set ROOT=%~dp0
cd /d "%ROOT%\backend"

echo Running customer profile seed...
node src/seeds/seed-customers.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Seed failed. Make sure the server is NOT running
    echo and your DATABASE_URL in backend\.env is correct.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Done! 489 customers loaded into memory.
echo   Restart the ERP and open Sales Orders to try it.
echo ============================================================
echo.
pause
