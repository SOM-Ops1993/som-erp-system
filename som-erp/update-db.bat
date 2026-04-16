@echo off
echo ============================================
echo   SOM ERP - Apply New DB Schema Tables
echo ============================================
echo.
echo This will create the following new tables:
echo   - product_master  (products with plant/equipment)
echo   - sfg_master      (semi-finished goods tracking)
echo.

cd /d "%~dp0backend"

echo [1/2] Running prisma db push...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo.
    echo ERROR: prisma db push failed.
    echo Make sure the backend .env file has the correct DATABASE_URL.
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
echo ============================================
echo   SUCCESS! New tables created.
echo   Restart the backend server now.
echo ============================================
echo.
pause
