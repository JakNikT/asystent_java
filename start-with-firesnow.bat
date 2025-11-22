@echo off
setlocal enabledelayedexpansion

REM Ustaw katalog roboczy na folder skryptu
cd /d "%~dp0"

echo ========================================
echo   Asystent Nart - Pelne Uruchomienie
echo   z polaczeniem do FireSnow
echo ========================================
echo.
echo Katalog roboczy: %CD%
echo.
echo UWAGA: Ten skrypt powinien byc uruchomiony z CMD (nie PowerShell)
echo        Jesli uruchamiasz z PowerShell, uzyj: cmd /c start-with-firesnow.bat
echo.

REM Sprawdz czy npm jest zainstalowany (uzywamy bezposredniego wywolania)
echo [INFO] Sprawdzanie Node.js/npm...
set NPM_CHECK=0
npm --version >nul 2>nul && set NPM_CHECK=1
if %NPM_CHECK%==0 (
    echo [BLAD] Node.js/npm nie jest zainstalowany lub nie jest w PATH!
    echo.
    echo Aby uruchomic serwer, musisz najpierw zainstalowac Node.js:
    echo.
    echo 1. Pobierz Node.js z: https://nodejs.org/
    echo 2. Zainstaluj wersje LTS (Long Term Support)
    echo 3. Zrestartuj komputer po instalacji
    echo 4. Uruchom ponownie ten plik z CMD (nie PowerShell)
    echo.
    pause
    exit /b 1
)

REM Wyswietl wersje npm dla potwierdzenia
for /f "tokens=*" %%v in ('npm --version 2^>nul') do set NPM_VERSION=%%v
if defined NPM_VERSION (
    echo [OK] Node.js/npm jest zainstalowany (wersja: !NPM_VERSION!)
) else (
    echo [OK] Node.js/npm jest zainstalowany
)
echo.

REM KROK 1: Uruchom serwer HSQLDB (jeśli istnieje)
if exist "FireSnowBridge\start_hsqldb_server.bat" (
    echo [KROK 1/5] Uruchamianie HSQLDB Server (port 9001)...
    echo   To jest wymagane dla polaczenia sieciowego z FireSnow
    echo.
    start "HSQLDB Server - FireSnow" cmd /k "cd /d %~dp0FireSnowBridge && start_hsqldb_server.bat"
    echo [INFO] Oczekiwanie na uruchomienie serwera HSQLDB (5 sekund)...
    timeout /t 5 /nobreak >nul
    echo [OK] HSQLDB Server uruchomiony
    echo.
) else (
    echo [OSTRZEZENIE] FireSnowBridge\start_hsqldb_server.bat nie znaleziony
    echo [INFO] Pomijam uruchomienie serwera HSQLDB
    echo [INFO] Upewnij sie ze FireSnowBridge jest skonfigurowany w trybie plikowym
    echo.
)

REM KROK 2: Uruchom FireSnowBridge API
if exist "FireSnowBridge\start.bat" (
    echo [KROK 2/5] Uruchamianie FireSnowBridge API (port 8080)...
    start "FireSnowBridge API" cmd /k "cd /d %~dp0FireSnowBridge && start.bat"
    timeout /t 3 /nobreak >nul
    echo [OK] FireSnowBridge API uruchomiony
    echo.
) else (
    echo [INFO] FireSnowBridge nie znaleziony - pomijam
    echo.
)

REM KROK 3: Uruchom Backend Server (jeśli istnieje folder backend)
if exist "backend\package.json" (
    echo [KROK 3/5] Uruchamianie Backend Server (z folderu backend)...
    start "Asystent Nart - Backend Server" cmd /k "cd /d %~dp0backend && npm run server"
    timeout /t 2 /nobreak >nul
    echo [OK] Backend Server uruchomiony
    echo.
) else (
    echo [INFO] Folder backend nie znaleziony - pomijam Backend Server
    echo.
)

REM KROK 4: Uruchom Node.js API Server (główny katalog)
echo [KROK 4/5] Uruchamianie Node.js API Server (port 3000)...
start "Asystent Nart - API Server" cmd /k "cd /d %~dp0 && npm run server"
timeout /t 2 /nobreak >nul
echo [OK] Node.js API Server uruchomiony
echo.

REM KROK 5: Uruchom Dev Server
echo [KROK 5/5] Uruchamianie Dev Server (port 5173)...
start "Asystent Nart - Dev Server" cmd /k "cd /d %~dp0 && npm run dev -- --host"
echo [OK] Dev Server uruchomiony
echo.

echo ========================================
echo   Wszystkie serwery uruchomione!
echo ========================================
echo.
echo Dostepne adresy:
if exist "FireSnowBridge\start.bat" (
    echo   - FireSnowBridge API: http://localhost:8080
    echo   - FireSnowBridge Health: http://localhost:8080/api/health
)
if exist "backend\package.json" (
    echo   - Backend Server:   (sprawdz port w backend/package.json)
)
echo   - Frontend (Dev):      http://localhost:5173
echo   - Node.js API Server:  http://localhost:3000
echo.
echo Polaczenie z FireSnow:
if exist "FireSnowBridge\start_hsqldb_server.bat" (
    echo   - HSQLDB Server:    port 9001 (sieciowe polaczenie)
) else (
    echo   - Tryb plikowy:     bezposredni dostep do bazy danych
)
echo.
echo ========================================
echo   Instrukcje:
echo ========================================
echo.
echo Aby zatrzymac wszystkie serwery:
echo   1. Zamknij wszystkie otwarte okna CMD
echo   2. Lub nacisnij Ctrl+C w kazdym oknie
echo.
echo UWAGA: Zostaw wszystkie okna otwarte (mozesz je zminimalizowac)
echo        Serwery musza byc uruchomione, aby aplikacja dzialala
echo.
pause

