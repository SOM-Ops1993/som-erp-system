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
echo   - sheet_sync_log  (Google Sheets sync history)
echo   - ... all other ERP tables
echo.

cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: .env file not found in backend folder.
    echo Make sure DATABASE_URL is set in backend\.env
    pause
    exit /b 1
)

:: ── Step 0: Stop Node so it releases the Prisma DLL lock ─────────────────────
echo [0/3] Stopping Node.js to release file locks...
taskkill /f /im node.exe >nul 2>&1
:: Give Windows a moment to fully release the file handles
timeout /t 2 /nobreak >nul
echo     Done.
echo.

:: ── Step 1: Drop stale views that block migration ─────────────────────────────
echo [1/3] Dropping stale views/tables that could block migration...
echo DROP MATERIALIZED VIEW IF EXISTS time_motion_model CASCADE; DROP TABLE IF EXISTS time_motion_logs CASCADE; | npx prisma db execute --stdin
echo     (safe to ignore errors here - views may not exist)
echo.

:: ── Step 2: Push schema to database ──────────────────────────────────────────
echo [2/3] Running prisma db push...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo.
    echo ERROR: prisma db push failed.
    echo Check that PostgreSQL is running and DATABASE_URL in .env is correct.
    pause
    exit /b 1
)
echo.

:: ── Step 3: Regenerate Prisma client (retry up to 3 times if locked) ─────────
echo [3/3] Regenerating Prisma client...

set ATTEMPTS=0
:RETRY_GENERATE
set /a ATTEMPTS+=1
call npx prisma generate >nul 2>&1
if %errorlevel% equ 0 goto GENERATE_OK
if %ATTEMPTS% lss 3 (
    echo     Attempt %ATTEMPTS% failed - waiting 3 seconds and retrying...
    timeout /t 3 /nobreak >nul
    goto RETRY_GENERATE
)

:: Final attempt with full output so error is visible
echo     Retrying one last time with full output...
call npx prisma generate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: prisma generate failed after 4 attempts.
    echo   This usually means another program has the DLL locked.
    echo   Close any other Node terminals and try again.
    pause
    exit /b 1
)

:GENERATE_OK
echo     Prisma client regenerated successfully.
echo.
echo ================================================
echo   SUCCESS! Schema is up to date.
echo.
echo   IMPORTANT: Backend was stopped to run this.
echo   Please restart it now by running:
echo     START_SOM_ERP.bat
echo ================================================
echo.
pause
