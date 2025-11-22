@echo off
echo ========================================
echo   Asystent Nart - Serwer Produkcyjny
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
    pause
    exit /b 1
)

echo [OK] Node.js jest zainstalowany
echo.

REM Sprawdz czy dist folder istnieje, jesli nie - zbuduj
if not exist "dist\" (
    echo [INFO] Folder dist nie istnieje. Budowanie aplikacji...
    echo.
    call npm run build
    echo.
    if %errorlevel% neq 0 (
        echo [BLAD] Nie udalo sie zbudowac aplikacji!
        pause
        exit /b 1
    )
    echo [OK] Aplikacja zbudowana pomyslnie
    echo.
) else (
    echo [INFO] Folder dist istnieje. Uzywam istniejacej wersji.
    echo [INFO] Aby przebudowac, usun folder dist i uruchom ponownie.
    echo.
)

echo Uruchamianie serwera produkcyjnego...
echo.
echo Serwer bedzie dostepny pod adresem:
echo - Lokalnie: http://localhost:3000
echo - W sieci: http://[TWOJ_IP]:3000
echo.
echo API Endpoints:
echo - GET  /api/skis         - lista sprzetu
echo - GET  /api/reservations - lista rezerwacji
echo - GET  /api/wypozyczenia/aktualne - lista wypozyczen
echo - GET  /api/health       - status serwera
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
