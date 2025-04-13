@echo off
setlocal enabledelayedexpansion

echo ===== Git Repository Cleanup =====

echo Step 1: Applying updated .gitignore...
git rm -r --cached .
git add .gitignore
git commit -m "Updated .gitignore to properly ignore all node_modules"

echo Step 2: Adding important source files...
git add src/*.js src/*.jsx src/*.css src/components/*.js src/components/*.jsx src/pages/*.js src/pages/*.jsx src/services/*.js src/utils/*.js src/styles/*.css
git add public/*.html public/*.ico public/*.json
git add *.json *.js *.md
git add .env.example .env.local.example

echo Step 3: Committing changes...
git commit -m "Clean up repository and save important source files"

echo Step 4: Switching to main branch...
git show-ref --verify --quiet refs/heads/main
if %ERRORLEVEL% NEQ 0 (
    echo Creating main branch...
    git checkout -b main
) else (
    echo Checking if we can switch to main branch...
    git checkout main
    if %ERRORLEVEL% NEQ 0 (
        echo Cannot switch to main branch, staying on current branch
    )
)

echo Step 5: Listing all branches...
git branch

echo ===== Cleanup Complete =====
echo.
echo Your repository has been cleaned up.
echo You can now delete unnecessary branches using:
echo git branch -D branch_name
echo.
echo Or merge your Testing-import branch into main using:
echo git merge Testing-import
echo.
pause
