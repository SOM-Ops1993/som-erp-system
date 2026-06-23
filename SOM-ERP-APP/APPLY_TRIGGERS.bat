@echo off
echo ==========================================
echo  SOM ERP - Apply Database Triggers
echo ==========================================
echo.

set PGPASSWORD=SomErp2026!
set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"

echo Applying triggers to database...
%PSQL% -U som_user -h localhost -p 5432 -d som_erp -f "%~dp0backend\prisma\migrations\001_setup.sql"

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Some triggers may not have applied.
    echo The system will still work - triggers are optional for basic use.
) else (
    echo.
    echo Triggers applied successfully!
)

echo.
pause
