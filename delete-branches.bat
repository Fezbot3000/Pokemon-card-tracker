@echo off
echo Deleting unnecessary branches...

git branch -D backup-pre-debug
git branch -D backup/2025-03-25-1526
git branch -D backup/2025-03-25-1527
git branch -D backup/2025-03-25-1530
git branch -D backup/2025-03-25-1533
git branch -D backup/2025-03-25-1541
git branch -D backup/2025-03-25-1543
git branch -D backup/2025-03-25-1556
git branch -D backup/2025-03-25-1604
git branch -D backup/2025-03-25-1607
git branch -D backup/2025-03-25-1837
git branch -D backup/2025-03-25-1930
git branch -D backup/march-24-2025
git branch -D before-stripe
git branch -D fixed-working-version
git branch -D recover-from-126a760
git branch -D recovery-126a760
git branch -D working-backup
git branch -D working-live-version
git branch -D working-version

echo Branch cleanup complete!
echo Remaining branches:
git branch

pause
