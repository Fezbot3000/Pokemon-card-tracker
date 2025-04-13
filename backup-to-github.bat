@echo off
echo ===== GitHub Backup Script =====

REM Get current date and time for commit message
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

echo Current date and time: %timestamp%
echo.

echo Step 1: Checking Git status...
git status
echo.

set /p message=Enter commit message (or press Enter for automatic backup message): 

if "%message%"=="" (
    set "message=Automatic backup %timestamp%"
)

echo.
echo Step 2: Adding all changes...
git add .
echo.

echo Step 3: Committing changes with message: "%message%"
git commit -m "%message%"
echo.

echo Step 4: Pushing to GitHub...
git push origin main
echo.

echo ===== Backup Complete =====
echo Your changes have been backed up to GitHub.
echo Repository: https://github.com/Fezbot3000/Pokemon-card-tracker
echo.
pause
