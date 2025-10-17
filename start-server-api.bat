@echo off
echo ========================================
echo   Asystent Nart - Backend API Server
echo ========================================
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
    echo Wiecej informacji: docs\INSTRUKCJA_SERWER_SIECIOWY.md
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js jest zainstalowany
echo.

REM Sprawdz czy dist folder istnieje
if not exist "dist\" (
    echo [UWAGA] Folder dist nie istnieje. Buduję aplikację...
    echo.
    call npm run build
    echo.
    if %errorlevel% neq 0 (
        echo [BLAD] Nie udalo sie zbudowac aplikacji!
        pause
        exit /b 1
    )
)

echo [OK] Aplikacja zbudowana
echo.
echo Uruchamianie serwera API...
echo.
echo Serwer bedzie dostepny pod adresem:
echo - Lokalnie: http://localhost:3000
echo - W sieci: http://[TWOJ_IP]:3000
echo.
echo API Endpoints:
echo - GET  /api/skis         - lista nart
echo - POST /api/skis         - dodaj nartę
echo - PUT  /api/skis/:id     - edytuj nartę
echo - GET  /api/reservations - lista rezerwacji
echo.
echo Aby zatrzymac serwer, nacisnij Ctrl+C
echo.
echo ========================================
echo.

npm run server

echo.
echo ========================================
echo Serwer zostal zatrzymany
echo ========================================
pause

