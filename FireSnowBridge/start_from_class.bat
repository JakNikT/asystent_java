@echo off
REM Start API from .class files (without JAR)

cd /d C:\FireSnowBridge

echo Starting FireSnow Bridge API from .class files...
echo.

java -cp "src;lib\hsqldb.jar" FireSnowBridge

pause


