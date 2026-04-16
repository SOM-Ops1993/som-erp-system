@echo off
echo ==========================================
echo  SOM ERP v2 - Step 2: Install Backend
echo ==========================================
echo.

rem ---- Check Node.js ----
where node >/dev/null 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Download from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js found OK.

rem ---- Move into backend folder ----
cd /d "%~dp0backend"
echo Entered backend folder OK.

rem ---- Create .env file ----
echo Creating .env file...
(
echo DATABASE_URL=postgresql://som_user:SomErp2026!@localhost:5432/som_erp
echo PORT=3001
echo NODE_ENV=development
echo FRONTEND_URL=http://localhost:5173
) > .env
echo .env file created.

rem ---- Install packages ----
echo.
echo Installing Node packages...
call npm install
echo Packages installed OK.

rem ---- Prisma setup ----
echo.
echo Setting up database tables...
call npx prisma generate
call npx prisma db push --accept-data-loss
echo Database tables created OK.

rem ---- Apply triggers using individual params (not URI) ----
echo.
echo Applying triggers and rules...
set PGPASSWORD=SomErp2026!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U som_user -h localhost -p 5432 -d som_erp -f "prisma\migrations\001_setup.sql"
echo Triggers applied.

echo.
echo ==========================================
echo  Backend setup COMPLETE!
echo ==========================================
echo.
pause
