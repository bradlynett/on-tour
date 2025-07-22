@echo off
cd /d "C:\Users\bradl\OneDrive\Desktop\Concert Travel App\concert-travel-app\backend"
node scripts/generate-suggestions-for-all-users.js
echo Trip suggestions generation completed at %date% %time% 