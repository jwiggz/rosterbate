@echo off
setlocal

for %%I in ("%~dp0.") do set "APP_ROOT=%%~fI"
for %%I in ("%~dp0..\tools\serve-local.ps1") do set "SERVE_SCRIPT=%%~fI"
set "PORT=8080"

if not exist "%SERVE_SCRIPT%" (
  echo.
  echo Could not find the local dev server script:
  echo   %SERVE_SCRIPT%
  echo.
  echo Expected app root:
  echo   %APP_ROOT%
  echo.
  pause
  exit /b 1
)

echo.
echo Starting RosterBate local dev server on port %PORT%...
echo App root: %APP_ROOT%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVE_SCRIPT%" -Port %PORT% -RootPath "%APP_ROOT%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo The local dev server could not start.
  echo If port %PORT% is already in use, close the other server and try again.
  echo.
  pause
  exit /b %EXIT_CODE%
)

endlocal
