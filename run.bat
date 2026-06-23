@echo off
title TempMail Manager - Starting...
color 0B
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       TempMail Manager - Launcher        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed!
    echo  Please download and install Node.js from:
    echo  https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo  [OK] Node.js %NODE_VERSION% detected
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  [INSTALL] Installing dependencies...
    echo  This may take a few minutes on first run...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo  [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed successfully
    echo.
)

:: Check if .env exists, if not copy from .env.example
if not exist ".env" (
    if exist ".env.example" (
        echo  [CONFIG] Creating .env from .env.example...
        copy .env.example .env >nul
        echo  [OK] .env file created
        echo.
    )
)

:: Run Prisma generate and db push
echo  [DATABASE] Setting up database...
call npx prisma generate >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Prisma generate had issues, continuing...
)

call npx prisma db push --accept-data-loss >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Prisma db push had issues, continuing...
)
echo  [OK] Database ready
echo.

:: Open browser immediately
echo  [BROWSER] Opening browser...
start http://localhost:3000

:: Start the dev server
echo  [SERVER] Starting TempMail Manager...
echo  ────────────────────────────────────────────
echo  App will be available at: http://localhost:3000
echo  Press Ctrl+C to stop the server
echo  ────────────────────────────────────────────
echo.
call npm run dev
