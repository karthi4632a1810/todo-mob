# Build APK Script for Windows PowerShell
# Run this script to build your Android APK

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building Todo App APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if EAS CLI is installed
Write-Host "Checking EAS CLI..." -ForegroundColor Yellow
$easVersion = eas --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: EAS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g eas-cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "EAS CLI found: $easVersion" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Expo login status..." -ForegroundColor Yellow
$whoami = eas whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not logged in to Expo. Please run:" -ForegroundColor Red
    Write-Host "eas login" -ForegroundColor Yellow
    exit 1
}
Write-Host "Logged in as: $whoami" -ForegroundColor Green
Write-Host ""

# Navigate to mobile directory
Set-Location $PSScriptRoot

# Check if eas.json exists
if (-not (Test-Path "eas.json")) {
    Write-Host "EAS configuration not found. Initializing..." -ForegroundColor Yellow
    Write-Host "Please run manually: eas init" -ForegroundColor Yellow
    Write-Host "Then answer 'y' to create a new project" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting Android APK build..." -ForegroundColor Cyan
Write-Host "This will take 10-20 minutes. You can check progress at:" -ForegroundColor Yellow
Write-Host "https://expo.dev/accounts/$whoami/projects/todo-app/builds" -ForegroundColor Cyan
Write-Host ""

# Start the build
eas build --platform android --profile preview

Write-Host ""
Write-Host "Build process started!" -ForegroundColor Green
Write-Host "Check the Expo dashboard for progress and download link." -ForegroundColor Yellow

