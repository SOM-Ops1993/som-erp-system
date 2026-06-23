@echo off
echo ============================================================
echo   SOM ERP — Push to GitHub (triggers Render auto-deploy)
echo ============================================================
echo.
echo Render will automatically build the frontend and restart
echo the server after this push. Takes ~2-3 minutes.
echo.

set ROOT=%~dp0
cd /d "%ROOT%"

:: Check git
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not a git repository.
    echo Run SETUP_GIT.bat first to initialise and connect to GitHub.
    pause
    exit /b 1
)

echo [1/3] Staging all changes...
git add -A
echo       Done.
echo.

echo [2/3] Committing...
git commit -m "Deploy [%date% %time%] — latest SOM ERP changes"
if %errorlevel% neq 0 (
    echo  (No new changes to commit — pushing anyway)
)
echo.

echo [3/3] Pushing to GitHub...
git push
if %errorlevel% neq 0 (
    echo.
    echo ERROR: git push failed.
    echo Common fixes:
    echo   - Run:  git remote add origin https://github.com/YOUR/REPO.git
    echo   - Run:  git push -u origin main
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   PUSHED!  Render is now deploying automatically.
echo.
echo   What Render does next (render.yaml build command):
echo     1. Builds the React frontend (npm run build)
echo     2. Copies frontend/dist to backend/public
echo     3. Installs backend dependencies
echo     4. Runs prisma generate
echo     5. Starts: node src/server.js
echo.
echo   Track live at: https://dashboard.render.com
echo   Your app will be ready in ~2-3 minutes.
echo ============================================================
echo.
pause
