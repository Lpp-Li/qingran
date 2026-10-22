@echo off
setlocal
title Qingran Local Service - Keep This Window Open
cd /d "%~dp0"

set "NODE_EXE="
if exist "%~dp0node.exe" set "NODE_EXE=%~dp0node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE_EXE for %%N in (node.exe) do if exist "%%~$PATH:N" set "NODE_EXE=%%~$PATH:N"

if not defined NODE_EXE goto no_node

echo.
echo Starting Qingran, your browser will open automatically...
echo Keep this window open while using the app. Close it to stop the local service.
echo.
echo Using Node: %NODE_EXE%
"%NODE_EXE%" "%~dp0server.js"
if errorlevel 1 goto failed
exit /b 0

:no_node
echo.
echo Node.js was not found, so Qingran cannot start.
echo Put node.exe in this folder, or install Node.js, then try again.
echo.
pause
exit /b 1

:failed
echo.
echo Qingran exited with an error. Please keep a screenshot of this window.
pause
exit /b 1