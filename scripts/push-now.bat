@echo off
cd /d "%~dp0.."
echo === BrightPath git push === > push-result.txt
echo. >> push-result.txt
git status --porcelain >> push-result.txt 2>&1
git add -A >> push-result.txt 2>&1
git commit -m "fix: bottom nav Home goes to app root; add Learn tab for dashboard" >> push-result.txt 2>&1
git push origin main >> push-result.txt 2>&1
git log -3 --oneline >> push-result.txt 2>&1
git status -sb >> push-result.txt 2>&1
echo. >> push-result.txt
echo DONE >> push-result.txt
type push-result.txt
