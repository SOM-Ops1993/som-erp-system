@echo off
echo ================================================
echo   SOM ERP - Apply New / Updated DB Schema
echo ================================================
echo.
echo This will create any missing tables and update
echo existing ones. Existing DATA is NOT deleted.
echo.
echo Tables being ensured:
echo   - sfg_master      (semi-finished goods tracking)
echo   - product_master  (products with plant info)
echo   - equipment_master
echo   - ... all other ERP tables
echo.

cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: .env file not found in backend folder.
    echo Make sure DATABASE_URL is set in backend\.env
    pause
    exit /b 1
)

echo [1/2] Running prisma db push...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo.
    echo ERROR: prisma db push failed.
    echo Check that PostgreSQL is running and DATABASE_URL in .env is correct.
    pause
    exit /b 1
)

echo.
echo [2/2] Regenerating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: prisma generate failed.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   SUCCESS! Schema is up to date.
echo.
echo   Now restart the backend:
echo   - Close the backend terminal window
echo   - Run START_SOM_ERP.bat again
echo ================================================
echo.
pause
