@echo off
REM Test struktury bazy danych
echo Tworzenie tymczasowego skryptu SQL...

echo SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='RESERVATIONPOSITION'; > temp_query.sql

echo.
echo Uruchamianie zapytania...
echo.

java -cp "lib\hsqldb.jar" org.hsqldb.util.SqlTool --rcFile=sqltooltestrc --sql="SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='RESERVATIONPOSITION'" mem

del temp_query.sql
pause



