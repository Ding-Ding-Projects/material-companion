@echo off
setlocal
if /I "%~1"=="--web-only" goto web
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-native.ps1" %*
if errorlevel 1 exit /b %errorlevel%
if exist "%~dp0extension\package.json" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-extension.ps1"
exit /b %errorlevel%

:web
where node.exe >nul 2>nul
if errorlevel 1 exit /b 2
node.exe "%~dp0scripts\build-web.mjs"
exit /b %errorlevel%
