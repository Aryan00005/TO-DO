@echo off
echo.
echo ========================================
echo   TODO System - Test Runner
echo ========================================
echo.
echo Choose an option:
echo.
echo 1. Run ALL tests
echo 2. Phase 1 - Health ^& Database
echo 3. Phase 2 - Authentication
echo 4. Phase 3 - Task CRUD
echo 5. Phase 4 - Admin ^& Roles
echo 6. Phase 5 - Security
echo 7. Install dependencies
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" (
    echo.
    echo Running all tests...
    npm test
) else if "%choice%"=="2" (
    echo.
    echo Running Phase 1 tests...
    npm run test:phase1
) else if "%choice%"=="3" (
    echo.
    echo Running Phase 2 tests...
    npm run test:phase2
) else if "%choice%"=="4" (
    echo.
    echo Running Phase 3 tests...
    npm run test:phase3
) else if "%choice%"=="5" (
    echo.
    echo Running Phase 4 tests...
    npm run test:phase4
) else if "%choice%"=="6" (
    echo.
    echo Running Phase 5 tests...
    npm run test:phase5
) else if "%choice%"=="7" (
    echo.
    echo Installing dependencies...
    npm install
) else if "%choice%"=="8" (
    echo.
    echo Exiting...
    exit /b
) else (
    echo.
    echo Invalid choice. Please try again.
)

echo.
pause
