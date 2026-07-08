@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:5180
  py -m http.server 5180
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:5180
  python -m http.server 5180
  exit /b
)
start "" index.html
