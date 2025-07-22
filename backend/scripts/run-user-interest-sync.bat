@echo off
echo 🎯 Running Concert Travel App User Interest Sync...
echo.

cd /d "%~dp0.."
node scripts\schedule-user-interest-sync.js

echo.
echo ✅ Sync completed!
pause 