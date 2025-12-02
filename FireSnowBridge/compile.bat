@echo off
REM Kompilacja FireSnow Bridge API z Java 21
REM ================================

echo Kompilowanie FireSnowBridge.java z Java 21...

REM Sprawdz czy hsqldb.jar istnieje
if not exist "lib\hsqldb.jar" (
    echo BLAD: Brak pliku lib\hsqldb.jar
    pause
    exit /b 1
)

REM Użyj kompilatora Java 21
set JAVAC_21="C:\Program Files\Java\jdk-21.0.9+10\bin\javac.exe"
set JAR_21="C:\Program Files\Java\jdk-21.0.9+10\bin\jar.exe"

REM Kompiluj
%JAVAC_21% -cp "lib\hsqldb.jar" src\FireSnowBridge.java

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Tworzenie JAR...
    cd src
    %JAR_21% cf ..\FireSnowBridge.jar FireSnowBridge*.class
    cd ..
    
    REM Usun pliki .class
    del src\FireSnowBridge*.class
    
    echo.
    echo ========================================
    echo   Sukces! FireSnowBridge.jar przekompilowany z Java 21
    echo ========================================
) else (
    echo.
    echo BLAD kompilacji!
)

pause