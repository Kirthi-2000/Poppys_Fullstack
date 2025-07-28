@echo off
cd /d E:\PoppysNew

REM Add all changes
git add .

REM Ask for commit message
set /p msg="Enter commit message: "
if "%msg%"=="" set msg=Update on %date% %time%

REM Commit
git commit -m "%msg%"

REM Push to remote (default: origin, current branch)
git push -u origin main

pause
