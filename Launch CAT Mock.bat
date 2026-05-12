@echo off
setlocal
cd /d "%~dp0"

if not exist build\index.html (
  echo Building CAT Mock UI...
  call npm run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)

echo Starting CAT Mock UI...
start "CAT Mock UI Server" cmd /k "cd /d %~dp0 && npm run serve"
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
