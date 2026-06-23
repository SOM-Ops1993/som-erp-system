@echo off
echo ==========================================
echo  SOM ERP v2 - Step 1: Database Setup
echo ==========================================
echo.

set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"

echo Using PostgreSQL at: C:\Program Files\PostgreSQL\16\bin\psql.exe
echo.
echo You will be asked for your PostgreSQL password (the one you set during install).
echo Type it and press Enter. The cursor will NOT move - that is normal.
echo.

%PSQL% -U postgres -c "CREATE USER som_user WITH PASSWORD 'SomErp2026!';"
%PSQL% -U postgres -c "CREATE DATABASE som_erp OWNER som_user;"
%PSQL% -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE som_erp TO som_user;"

echo.
echo ==========================================
echo  Database setup COMPLETE!
echo   Database : som_erp
echo   User     : som_user
echo   Password : SomErp2026!
echo ==========================================
echo.
pause
