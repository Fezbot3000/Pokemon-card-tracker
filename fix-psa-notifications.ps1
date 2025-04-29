# PowerShell script to fix PSA notifications

# 1. Update PSANotifications.js styling to match app theme
$psaNotificationsPath = ".\src\components\PSANotifications.js"
$content = Get-Content -Path $psaNotificationsPath -Raw

# Update styling
$content = $content -replace "background: '#f0f0f0'", "background: 'var(--toast-bg, #1e293b)'"
$content = $content -replace "color: '#333'", "color: 'var(--toast-text, white)'"

# Use consistent toast ID to prevent duplicates
$content = $content -replace "icon: null // No icon", "icon: null, // No icon`n      id: 'psa-notification' // Use consistent ID to prevent multiple toasts"

# Write the updated content back
Set-Content -Path $psaNotificationsPath -Value $content

# 2. Update CardDetailsModal.js to remove duplicate error messages
$cardDetailsModalPath = ".\src\design-system\components\CardDetailsModal.js"
$content = Get-Content -Path $cardDetailsModalPath -Raw

# Remove the duplicate error message
$content = $content -replace "toast.error\('No valid PSA data found for this serial number'\);", "// Error handling is now done in the PSA search service"
$content = $content -replace "toast.error\(`Failed to find PSA certificate: \$\{error.message\}`\);", "// Error handling is now done in the PSA search service"

# Write the updated content back
Set-Content -Path $cardDetailsModalPath -Value $content

Write-Host "PSA notification fixes applied successfully!"
