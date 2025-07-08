# ESLint Watcher PowerShell Script
# This script starts the ESLint watcher in the background and provides process management

param(
    [string]$Action = "start"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PidFile = Join-Path $ScriptDir "eslint-watcher.pid"
$LogFile = Join-Path $ScriptDir "eslint-watcher.log"

# Function to check if watcher is running
function Test-WatcherRunning {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            return $true
        }
        catch {
            Remove-Item $PidFile -ErrorAction SilentlyContinue
            return $false
        }
    }
    return $false
}

# Function to start the watcher
function Start-Watcher {
    if (Test-WatcherRunning) {
        $pid = Get-Content $PidFile
        Write-Host "❌ ESLint watcher is already running (PID: $pid)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🚀 Starting ESLint watcher..." -ForegroundColor Green
    
    # Start the watcher in the background
    $process = Start-Process -FilePath "node" -ArgumentList (Join-Path $ScriptDir "eslint-watcher.js") -NoNewWindow -PassThru -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile
    $process.Id | Out-File -FilePath $PidFile -Encoding utf8
    
    Start-Sleep -Seconds 2
    
    if (Test-WatcherRunning) {
        $pid = Get-Content $PidFile
        Write-Host "✅ ESLint watcher started successfully (PID: $pid)" -ForegroundColor Green
        Write-Host "📁 Log file: $LogFile" -ForegroundColor Cyan
        Write-Host "📊 Check status with: node eslint-watcher.js --status" -ForegroundColor Cyan
        Write-Host "🛑 Stop with: .\start-eslint-watcher.ps1 stop" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Failed to start ESLint watcher" -ForegroundColor Red
        if (Test-Path $LogFile) {
            Write-Host "📋 Last few log lines:" -ForegroundColor Yellow
            Get-Content $LogFile -Tail 5
        }
        exit 1
    }
}

# Function to stop the watcher
function Stop-Watcher {
    if (-not (Test-WatcherRunning)) {
        Write-Host "❌ ESLint watcher is not running" -ForegroundColor Red
        exit 1
    }
    
    $pid = Get-Content $PidFile
    Write-Host "🛑 Stopping ESLint watcher (PID: $pid)..." -ForegroundColor Yellow
    
    try {
        Stop-Process -Id $pid -ErrorAction Stop
        Start-Sleep -Seconds 2
        Remove-Item $PidFile -ErrorAction SilentlyContinue
        Write-Host "✅ ESLint watcher stopped successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to stop watcher: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to show status
function Show-Status {
    if (Test-WatcherRunning) {
        $pid = Get-Content $PidFile
        Write-Host "✅ ESLint watcher is running (PID: $pid)" -ForegroundColor Green
        Write-Host "📁 Log file: $LogFile" -ForegroundColor Cyan
        Write-Host ""
        & node (Join-Path $ScriptDir "eslint-watcher.js") --status
    }
    else {
        Write-Host "❌ ESLint watcher is not running" -ForegroundColor Red
    }
}

# Function to show logs
function Show-Logs {
    if (Test-Path $LogFile) {
        Write-Host "📋 ESLint watcher logs:" -ForegroundColor Cyan
        Get-Content $LogFile -Tail 20
    }
    else {
        Write-Host "❌ No log file found" -ForegroundColor Red
    }
}

# Main command handling
switch ($Action.ToLower()) {
    "start" {
        Start-Watcher
    }
    "stop" {
        Stop-Watcher
    }
    "restart" {
        if (Test-WatcherRunning) {
            Stop-Watcher
            Start-Sleep -Seconds 2
        }
        Start-Watcher
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    default {
        Write-Host "Usage: .\start-eslint-watcher.ps1 [action]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Actions:" -ForegroundColor Cyan
        Write-Host "  start    - Start the ESLint watcher"
        Write-Host "  stop     - Stop the ESLint watcher"
        Write-Host "  restart  - Restart the ESLint watcher"
        Write-Host "  status   - Show watcher status and ESLint results"
        Write-Host "  logs     - Show recent watcher logs"
        exit 1
    }
} 