# Test deployment script to identify CPU configuration issues (PowerShell)
Write-Host "🧪 Testing Firebase deployment to identify CPU configuration issue..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "firebase.json")) {
    Write-Host "❌ Error: firebase.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Current Firebase configuration:" -ForegroundColor Yellow
Get-Content "firebase.json" | Write-Host

Write-Host ""
Write-Host "🔍 Checking functions configuration..." -ForegroundColor Yellow

# Check functions package.json
Write-Host "📦 Functions package.json:" -ForegroundColor Yellow
Get-Content "functions/package.json" | Write-Host

Write-Host ""
Write-Host "🔄 Testing functions deployment..." -ForegroundColor Yellow

# Try to deploy functions with verbose output
Write-Host "📤 Attempting functions deployment with verbose output..." -ForegroundColor Yellow
try {
    $result = firebase deploy --project mycardtracker-c8479 --non-interactive --only functions --debug 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Functions deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Functions deployment failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 The error suggests a CPU configuration issue with 1st generation functions." -ForegroundColor Yellow
        Write-Host "   This typically happens when:" -ForegroundColor Yellow
        Write-Host "   1. CPU configuration is set in Firebase project settings" -ForegroundColor White
        Write-Host "   2. Functions are configured for 2nd generation but deployed as 1st generation" -ForegroundColor White
        Write-Host "   3. There's a mismatch between local and remote configuration" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Solutions to try:" -ForegroundColor Yellow
        Write-Host "   1. Check Firebase Console > Functions for CPU settings" -ForegroundColor White
        Write-Host "   2. Remove any CPU configuration from functions" -ForegroundColor White
        Write-Host "   3. Upgrade functions to 2nd generation if needed" -ForegroundColor White
        Write-Host "   4. Use the fix-firebase-deployment.sh script" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ Error during deployment: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Test completed successfully!" -ForegroundColor Green 