# Setup Windows Task Scheduler for Trip Suggestions
# This script creates a scheduled task to run trip suggestions every hour

$taskName = "ConcertTravelApp-TripSuggestions"
$scriptPath = "C:\Users\bradl\OneDrive\Desktop\Concert Travel App\concert-travel-app\backend\scripts\schedule-trip-suggestions.bat"
$workingDir = "C:\Users\bradl\OneDrive\Desktop\Concert Travel App\concert-travel-app\backend"

Write-Host "Setting up Windows Task Scheduler for Trip Suggestions" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task '$taskName' already exists. Removing it first..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the action
$action = New-ScheduledTaskAction -Execute $scriptPath -WorkingDirectory $workingDir

# Create the trigger (every hour)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create the task
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Description "Generate trip suggestions for all users in Concert Travel App"

# Register the task
Register-ScheduledTask -TaskName $taskName -InputObject $task -User "SYSTEM"

Write-Host "✅ Task '$taskName' created successfully!" -ForegroundColor Green
Write-Host "📅 Schedule: Every hour" -ForegroundColor Cyan
Write-Host "🔄 Next run: Will start on next hour" -ForegroundColor Cyan
Write-Host "💡 To view/manage: Open Task Scheduler and look for '$taskName'" -ForegroundColor Yellow

# Test the script
Write-Host "`n🧪 Testing the script..." -ForegroundColor Yellow
if (Test-Path $scriptPath) {
    Write-Host "✅ Script file exists at: $scriptPath" -ForegroundColor Green
} else {
    Write-Host "❌ Script file not found at: $scriptPath" -ForegroundColor Red
    Write-Host "Please check the path and run this script again." -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup complete! Trip suggestions will now run automatically every hour." -ForegroundColor Green 