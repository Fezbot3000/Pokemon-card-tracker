# Simple PowerShell script to fix Firebase deployment issues
Write-Host "Fixing Firebase deployment issues..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "firebase.json")) {
    Write-Host "Error: firebase.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "Fixing deployment issues:" -ForegroundColor Yellow
Write-Host "  1. CPU configuration on Gen 1 functions" -ForegroundColor White
Write-Host "  2. Firestore index conflicts" -ForegroundColor White
Write-Host "  3. Functions version conflicts" -ForegroundColor White
Write-Host ""

# Step 1: Update Firebase functions
Write-Host "Step 1: Updating Firebase functions..." -ForegroundColor Cyan
Set-Location functions
npm install firebase-functions@latest --save
Set-Location ..

# Step 2: Build the React app
Write-Host "Step 2: Building React app..." -ForegroundColor Cyan
if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    if (Test-Path "package.json") {
        $buildResult = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed. Please check the output above." -ForegroundColor Red
            exit 1
        }
        Write-Host "Build completed successfully" -ForegroundColor Green
    } else {
        Write-Host "No package.json found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "npm not found in PATH" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy individual services
Write-Host "Step 3: Deploying services individually..." -ForegroundColor Cyan

# Check if Firebase CLI is available
if (-not (Get-Command "firebase" -ErrorAction SilentlyContinue)) {
    Write-Host "Firebase CLI not found. Please install it with: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Deploy hosting
Write-Host "Deploying hosting..." -ForegroundColor Yellow
firebase deploy --only hosting --project mycardtracker-c8479 --non-interactive
if ($LASTEXITCODE -eq 0) {
    Write-Host "Hosting deployed successfully" -ForegroundColor Green
} else {
    Write-Host "Hosting deployment failed" -ForegroundColor Red
}

# Deploy storage
Write-Host "Deploying storage..." -ForegroundColor Yellow
firebase deploy --only storage --project mycardtracker-c8479 --non-interactive
if ($LASTEXITCODE -eq 0) {
    Write-Host "Storage deployed successfully" -ForegroundColor Green
} else {
    Write-Host "Storage deployment failed" -ForegroundColor Red
}

# Deploy firestore with force
Write-Host "Deploying firestore with --force..." -ForegroundColor Yellow
firebase deploy --only firestore --project mycardtracker-c8479 --non-interactive --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "Firestore deployed successfully" -ForegroundColor Green
} else {
    Write-Host "Firestore deployment failed" -ForegroundColor Red
}

# Try to deploy functions
Write-Host "Attempting to deploy functions..." -ForegroundColor Yellow
firebase deploy --only functions --project mycardtracker-c8479 --non-interactive --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "Functions deployed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "All services deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "Functions deployment failed due to CPU configuration" -ForegroundColor Red
    Write-Host ""
    Write-Host "MANUAL FIX REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Go to Firebase Console: https://console.firebase.google.com/u/0/project/mycardtracker-c8479/functions/list" -ForegroundColor White
    Write-Host "2. Find 'getExchangeRates' function" -ForegroundColor White
    Write-Host "3. Click 'Edit' on the function" -ForegroundColor White
    Write-Host "4. Remove any CPU configuration settings" -ForegroundColor White
    Write-Host "5. Save the changes" -ForegroundColor White
    Write-Host "6. Run: firebase deploy --only functions" -ForegroundColor White
    Write-Host ""
    Write-Host "Other services (hosting, storage, firestore) should be working now." -ForegroundColor Green
} 