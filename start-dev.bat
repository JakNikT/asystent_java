@echo off
echo ========================================
echo   Asystent Nart - Tryb Deweloperski
echo ========================================
echo.
echo Uruchamianie serwera deweloperskiego i API...
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

REM Uruchom API server w osobnym oknie
echo [1/2] Uruchamianie API Server (port 3000)...
start "Asystent Nart - API Server" cmd /k "npm run server"
timeout /t 2 /nobreak >nul

REM Uruchom dev server w osobnym oknie
echo [2/2] Uruchamianie Dev Server (port 5173)...
start "Asystent Nart - Dev Server" cmd /k "npm run dev -- --host"

echo.
echo ========================================
echo   Serwery uruchomione!
echo ========================================
echo.
echo Dostepne adresy:
echo   - Frontend (Dev): http://localhost:5173
echo   - API Server:     http://localhost:3000
echo.
echo Aby zatrzymac serwery, zamknij okna cmd lub nacisnij Ctrl+C w kazdym oknie
echo.
pause

