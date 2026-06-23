@echo off
echo ==========================================
echo  SOM ERP v2 - Starting System
echo ==========================================
echo.

start "SOM ERP Backend" cmd /k "cd /d "%~dp0backend" && node src/server.js"
echo Backend starting on port 3001...
timeout /t 5 /nobreak >/dev/null

start "SOM ERP Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Frontend starting on port 5173...
timeout /t 6 /nobreak >/dev/null

start "" "http://localhost:5173"
echo.
echo SOM ERP is now running at http://localhost:5173
echo To stop: close the two black terminal windows.
echo.
