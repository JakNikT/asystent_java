@echo off
REM Wylaczamy echo zeby nie smiecic, ale mozna wlaczyc do debugowania
REM @echo on

REM Ustawienie sciezki na folder skryptu
cd /d "%~dp0"

echo ===================================================
echo   STARTOWANIE SYSTEMU - ASYSTENT NART
echo ===================================================
echo.

REM --- SPRAWDZENIE NODE.JS ---
echo [1/3] Sprawdzanie srodowiska Node.js...
call npm --version >nul 2>nul
if %errorlevel% neq 0 goto :BLAD_NODE
echo       OK - Node.js wykryty.
echo.

REM --- URUCHOMIENIE WATCHDOG ---
echo [2/3] Uruchamianie Watchdog (FireSnowBridge)...
if not exist "FireSnowBridge\start-with-watchdog.bat" goto :BLAD_BRAK_PLIKU

REM Uruchamiamy w nowym oknie i nie czekamy
start "FireSnowBridge Watchdog" cmd /k "cd /d "%~dp0FireSnowBridge" && start-with-watchdog.bat"

echo       OK - Watchdog uruchomiony w nowym oknie.
echo       Czekam 5 sekund na start uslug...
timeout /t 5 /nobreak >nul
echo.

REM --- URUCHOMIENIE SERWERA ---
echo [3/3] Uruchamianie Serwera Aplikacji...
echo       Serwer: http://localhost:3000
echo.
echo ---------------- LOGI SERWERA ----------------
echo.

REM Uruchamiamy serwer w tym oknie
call npm run server

REM Jesli serwer sie zakonczy, sprawdzamy kod bledu
if %errorlevel% neq 0 goto :BLAD_SERWER

echo.
echo ===================================================
echo   SERWER ZAKONCZYL PRACE POPRAWNIE
echo ===================================================
goto :KONIEC

:BLAD_NODE
echo.
echo [BLAD KRYTYCZNY] Nie znaleziono Node.js lub npm!
echo Prosze zainstalowac Node.js ze strony nodejs.org
goto :KONIEC

:BLAD_BRAK_PLIKU
echo.
echo [BLAD] Nie znaleziono pliku: FireSnowBridge\start-with-watchdog.bat
goto :KONIEC

:BLAD_SERWER
echo.
echo [BLAD] Serwer aplikacji zakonczyl dzialanie z bledem!
echo Kod bledu: %errorlevel%
goto :KONIEC

:KONIEC
echo.
echo Nacisnij dowolny klawisz aby zamknac to okno...
pause
