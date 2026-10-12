@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-native.ps1" %*
if errorlevel 1 exit /b %errorlevel%
if exist "%~dp0extension\package.json" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-extension.ps1"
exit /b %errorlevel%
