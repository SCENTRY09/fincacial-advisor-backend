@echo off
echo ========================================
echo Starting Financial Advisor Application
echo ========================================
echo.

echo [1/2] Starting Backend Server (Port 8080)...
start "Backend Server" cmd /k "cd server && npm start"

timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend (Port 3000)...
start "Frontend" cmd /k "cd client && npm start"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause >nul
