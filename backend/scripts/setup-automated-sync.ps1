param(
    [string]$TaskName = "ConcertTravelApp-UserInterestSync",
    [string]$StartTime = "02:00"
)

Write-Host "Setting up automated sync for Concert Travel App..."

$BackendDir = Get-Location
$ScriptPath = Join-Path $BackendDir "scripts\schedule-user-interest-sync.js"
$LogDir = Join-Path $BackendDir "logs"

if (-not (Test-Path $ScriptPath)) {
    Write-Host "Error: Sync script not found at $ScriptPath"
    exit 1
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    Write-Host "Created log directory: $LogDir"
}

$NodeCommand = "node"
$Arguments = "`"$ScriptPath`""
$WorkingDirectory = $BackendDir

try {
    $ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($ExistingTask) {
        Write-Host "Removing existing task: $TaskName"
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    $Action = New-ScheduledTaskAction -Execute $NodeCommand -Argument $Arguments -WorkingDirectory $WorkingDirectory
    $Trigger = New-ScheduledTaskTrigger -Daily -At $StartTime
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Sync events for user interests in Concert Travel App"

    Write-Host "Scheduled task created successfully!"
    Write-Host "Task Name: $TaskName"
    Write-Host "Schedule: Daily at $StartTime"
    Write-Host "Command: $NodeCommand $Arguments"
    Write-Host "Working Directory: $WorkingDirectory"

    Write-Host "To run manually: Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To stop: Stop-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To disable: Disable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To delete: Unregister-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To view status: Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "Logs will be written to: $LogDir"
    Write-Host "- user-interest-sync.log (detailed logs)"
    Write-Host "- last-sync-summary.json (summary of last run)"

} catch {
    Write-Host "Error creating scheduled task: $($_.Exception.Message)"
    exit 1
}

Write-Host "Automated sync setup complete! The sync will now run automatically every day at $StartTime." 