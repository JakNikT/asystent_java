@echo off
echo ========================================
echo   Asystent Nart - Uruchomienie Pelne
echo ========================================
echo.
echo Uruchamianie wszystkich serwerow (Dev + API + FireSnowBridge)...
echo.

REM Sprawdz czy npm jest zainstalowany
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [BLAD] Node.js/npm nie jest zainstalowany!
    echo.
    echo Aby uruchomic serwer, musisz najpierw zainstalowac Node.js:
    echo.
    echo 1. Pobierz Node.js z: https://nodejs.org/
    echo 2. Zainstaluj wersje LTS (Long Term Support)
    echo 3. Zrestartuj komputer po instalacji
    echo 4. Uruchom ponownie ten plik
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js jest zainstalowany
echo.

REM Sprawdz czy FireSnowBridge istnieje
if exist "FireSnowBridge\start.bat" (
    echo [1/3] Uruchamianie FireSnowBridge API (port 8080)...
    start "FireSnowBridge API" cmd /k "cd FireSnowBridge && start.bat"
    timeout /t 3 /nobreak >nul
    echo [OK] FireSnowBridge uruchomiony
    echo.
) else (
    echo [INFO] FireSnowBridge nie znaleziony - pomijam
    echo.
)

REM Uruchom API server w osobnym oknie
echo [2/3] Uruchamianie Node.js API Server (port 3000)...
start "Asystent Nart - API Server" cmd /k "npm run server"
timeout /t 2 /nobreak >nul
echo [OK] API Server uruchomiony
echo.

REM Uruchom dev server w osobnym oknie
echo [3/3] Uruchamianie Dev Server (port 5173)...
start "Asystent Nart - Dev Server" cmd /k "npm run dev -- --host"
echo [OK] Dev Server uruchomiony
echo.

echo ========================================
echo   Wszystkie serwery uruchomione!
echo ========================================
echo.
echo Dostepne adresy:
if exist "FireSnowBridge\start.bat" (
    echo   - FireSnowBridge API: http://localhost:8080
)
echo   - Frontend (Dev):      http://localhost:5173
echo   - Node.js API Server:  http://localhost:3000
echo.
echo Aby zatrzymac serwery, zamknij okna cmd lub nacisnij Ctrl+C w kazdym oknie
echo.
pause

