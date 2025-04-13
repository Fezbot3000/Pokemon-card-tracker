@echo off
setlocal enabledelayedexpansion

echo Cleaning up Git branches...

REM First, make sure we have a main branch
git show-ref --verify --quiet refs/heads/main
if %ERRORLEVEL% NEQ 0 (
    echo Creating main branch...
    git checkout -b main
) else (
    echo Switching to main branch...
    git checkout main
)

REM Get a list of all branches except main
echo Deleting all branches except main...
for /f "tokens=*" %%a in ('git branch ^| findstr /v "main"') do (
    set branch=%%a
    set branch=!branch:~2!
    echo Deleting branch !branch!...
    git branch -D !branch!
)

echo Branch cleanup complete!
echo You are now on the main branch.
pause
