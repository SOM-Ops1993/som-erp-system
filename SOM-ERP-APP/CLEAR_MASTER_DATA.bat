@echo off
echo ============================================================
echo   SOM ERP — Clear Master Data Tables
echo ============================================================
echo.
echo This will DELETE ALL records from:
echo.
echo   1. recipe_db       (Recipe / BOM formulations)
echo   2. equipment_master (Equipment list)
echo   3. product_master   (Inhouse product codes)
echo   4. rm_master        (Raw material item list)
echo.
echo   Stock Ledger, Packs, Inward, Outward are NOT touched.
echo.
echo ============================================================
echo.
set /p CONFIRM="Type  YES  (all caps) to confirm clear: "
if not "%CONFIRM%"=="YES" (
    echo.
    echo  Cancelled — nothing was deleted.
    pause
    exit /b 0
)

cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: .env not found in backend folder.
    pause
    exit /b 1
)

echo.
echo [0/5] Stopping Node to release DB connections...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       Done.
echo.

echo [1/5] Clearing Recipe / BOM  (recipe_db)...
echo DELETE FROM recipe_db; | npx prisma db execute --stdin
echo       Done.
echo.

echo [2/5] Clearing Equipment Master  (equipment_master)...
echo DELETE FROM equipment_master; | npx prisma db execute --stdin
echo       Done.
echo.

echo [3/5] Clearing Product Master  (product_master)...
echo DELETE FROM product_master; | npx prisma db execute --stdin
echo       Done.
echo.

echo [4/5] Clearing RM Master  (rm_master)...
echo DELETE FROM rm_master; | npx prisma db execute --stdin
echo       Done.
echo.

echo [5/5] Resetting auto-increment counters (if any)...
echo SELECT setval(pg_get_serial_sequence('product_master','id'), 1, false); | npx prisma db execute --stdin >nul 2>&1
echo SELECT setval(pg_get_serial_sequence('rm_master','id'), 1, false); | npx prisma db execute --stdin >nul 2>&1
echo SELECT setval(pg_get_serial_sequence('equipment_master','id'), 1, false); | npx prisma db execute --stdin >nul 2>&1
echo       Done.
echo.

echo ============================================================
echo   SUCCESS — 4 tables cleared.
echo.
echo   NEXT STEPS:
echo   1. Run  START_SOM_ERP.bat  to restart the app
echo   2. Go to  Data Import  page in the ERP
echo   3. Upload your fresh Excel file with sheets named:
echo        "RM Master"        — raw material list
echo        "Product Master"   — inhouse products
echo        "Equipment"        — equipment with working volume
echo        "Recipe" or "BOM"  — formulations
echo ============================================================
echo.
pause
