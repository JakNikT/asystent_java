@echo off
REM =========================================
REM FireSnow HSQLDB Server Starter
REM =========================================
REM 
REM Ten skrypt uruchamia HSQLDB Server, ktory udostepnia
REM baze danych FireSnow przez siec (port 9001).
REM 
REM UWAGA: FireSnowServer moze ale nie musi byc uruchomiony.
REM        Najlepiej uruchomic ten skrypt PO uruchomieniu FireSnow.
REM
REM Aby zatrzymac: Ctrl+C lub zamknij okno
REM =========================================

echo.
echo =========================================
echo   HSQLDB Server for FireSnow
echo   Port: 9001
echo =========================================
echo.

REM Sprawdz czy Java jest dostepna
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Java nie zostala znaleziona w PATH!
    echo.
    echo Sprawdz czy Java jest zainstalowana:
    echo   java -version
    echo.
    pause
    exit /b 1
)

REM Sprawdz czy hsqldb.jar istnieje
if not exist "lib\hsqldb.jar" (
    echo [BLAD] Plik lib\hsqldb.jar nie zostal znaleziony!
    echo.
    echo Skopiuj hsqldb.jar z FireSnow:
    echo   Z: C:\FireSoft\FireSnowServer20\lib\hsqldb.jar
    echo   Do: C:\FireSnowBridge\lib\hsqldb.jar
    echo.
    pause
    exit /b 1
)

REM Sprawdz czy baza danych istnieje
if not exist "C:\FireSoft\FireSnowServer20\database\FireSport_database_4.properties" (
    echo [OSTRZEZENIE] Plik bazy danych nie zostal znaleziony!
    echo Lokalizacja: C:\FireSoft\FireSnowServer20\database\FireSport_database_4.properties
    echo.
    echo Czy FireSnowServer jest zainstalowany w tej lokalizacji?
    echo.
    pause
)

echo [1/3] Sprawdzanie Javy...
java -version
echo.

echo [2/3] Uruchamianie HSQLDB Server...
echo Baza danych: C:/FireSoft/FireSnowServer20/database/FireSport_database_4
echo Port: 9001
echo.
echo [INFO] Aby zatrzymac serwer, nacisnij Ctrl+C lub zamknij to okno.
echo [INFO] Zostaw to okno otwarte (zminimalizuj je).
echo.
echo =========================================

REM Uruchom HSQLDB Server
REM --database.0 file:path  = sciezka do bazy (tryb file)
REM --dbname.0 name         = nazwa bazy (dla connection string)
REM --port                  = port nasluchu (9001 zamiast 11099)
REM --silent false          = pokaz logi
REM --trace false           = nie loguj zapytan SQL (zbyt duzo logow)

java -cp lib\hsqldb.jar org.hsqldb.server.Server ^
  --database.0 file:C:/FireSoft/FireSnowServer20/database/FireSport_database_4 ^
  --dbname.0 FireSport_database_4 ^
  --port 9001 ^
  --silent false ^
  --trace false

echo.
echo =========================================
echo HSQLDB Server zostal zatrzymany.
echo =========================================
pause



