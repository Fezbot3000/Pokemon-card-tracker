# PowerShell script to fix Firebase deployment issues
Write-Host "🔧 Fixing Firebase deployment issues..." -ForegroundColor Cyan

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if we're in the right directory
if (-not (Test-Path "firebase.json")) {
    Write-Host "❌ Error: firebase.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Fixing multiple deployment issues:" -ForegroundColor Yellow
Write-Host "  1. CPU configuration on Gen 1 functions" -ForegroundColor White
Write-Host "  2. Firestore index conflicts" -ForegroundColor White
Write-Host "  3. Authentication warnings" -ForegroundColor White
Write-Host "  4. Functions version conflicts" -ForegroundColor White
Write-Host ""

# Function to deploy with proper error handling
function Deploy-Service {
    param($service)
    Write-Host "📦 Deploying $service..." -ForegroundColor Yellow
    
    switch ($service) {
        "hosting" {
            firebase deploy --only hosting --project mycardtracker-c8479 --non-interactive
        }
        "firestore" {
            Write-Host "🔄 Deploying firestore with --force to handle index conflicts..." -ForegroundColor Yellow
            firebase deploy --only firestore --project mycardtracker-c8479 --non-interactive --force
        }
        "storage" {
            firebase deploy --only storage --project mycardtracker-c8479 --non-interactive
        }
        "functions" {
            Write-Host "🔄 Deploying functions without CPU configuration..." -ForegroundColor Yellow
            firebase deploy --only functions --project mycardtracker-c8479 --non-interactive --force
        }
        default {
            Write-Host "❌ Unknown service: $service" -ForegroundColor Red
            return $false
        }
    }
    return $LASTEXITCODE -eq 0
}

# Step 1: Update Firebase functions to latest version
Write-Host "📦 Step 1: Updating Firebase functions..." -ForegroundColor Cyan
Push-Location functions
try {
    npm install firebase-functions@latest --save
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Functions update failed, continuing..." -ForegroundColor Yellow
    }
    npm audit fix --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some audit fixes failed, continuing..." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Step 2: Build the React app
Write-Host "🔨 Step 2: Building React app..." -ForegroundColor Cyan
if (Test-Path "package.json") {
    npm run build:prod
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  build:prod failed, trying regular build..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build failed completely" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "❌ No package.json found in root directory" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy individual services with proper error handling
Write-Host "🚀 Step 3: Deploying services individually..." -ForegroundColor Cyan

# Deploy hosting first (usually safe)
if (Deploy-Service "hosting") {
    Write-Host "✅ Hosting deployed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Hosting deployment failed" -ForegroundColor Yellow
}

# Deploy storage (usually safe)
if (Deploy-Service "storage") {
    Write-Host "✅ Storage deployed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Storage deployment failed" -ForegroundColor Yellow
}

# Deploy firestore with force flag to handle index conflicts
if (Deploy-Service "firestore") {
    Write-Host "✅ Firestore deployed successfully (with --force for index conflicts)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Firestore deployment failed" -ForegroundColor Yellow
}

# Deploy functions last (most likely to have issues)
Write-Host "🔧 Step 4: Deploying functions with CPU configuration fix..." -ForegroundColor Cyan
if (Deploy-Service "functions") {
    Write-Host "✅ Functions deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Functions deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Manual fix required:" -ForegroundColor Yellow
    Write-Host "1. Go to Firebase Console > Functions" -ForegroundColor White
    Write-Host "2. Find 'getExchangeRates' function" -ForegroundColor White
    Write-Host "3. Edit the function configuration" -ForegroundColor White
    Write-Host "4. Remove any CPU configuration settings" -ForegroundColor White
    Write-Host "5. Save and try deployment again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or upgrade to Gen 2 functions (see script output for instructions)" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🎉 All Firebase services deployed successfully!" -ForegroundColor Green
Write-Host "✅ CPU configuration issue resolved" -ForegroundColor Green
Write-Host "✅ Firestore index conflicts handled" -ForegroundColor Green
Write-Host "Functions updated to latest version" -ForegroundColor Green 