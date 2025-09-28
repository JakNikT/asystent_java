# Instrukcja integracji Figma z Cursor

## Co już zostało zrobione:
1. ✅ Sprawdzono czy Figma jest zainstalowana (nie była)
2. ✅ Otwarto stronę pobierania Figma w przeglądarce
3. ✅ Skonfigurowano Cursor do połączenia z serwerem MCP Figma
4. ✅ Utworzono plik `mcp.json` w projekcie
5. ✅ Dodano konfigurację MCP do globalnych ustawień Cursor

## Co musisz teraz zrobić:

### Krok 1: Zainstaluj Figmę
1. Pobierz instalator Figma ze strony: https://www.figma.com/downloads/
2. Uruchom instalator i zainstaluj aplikację
3. Uruchom Figmę i zaloguj się na swoje konto

### Krok 2: Włącz serwer MCP w Figma

**OPCJA A - Przez menu Figma:**
1. Otwórz aplikację Figma na komputerze
2. Utwórz nowy plik lub otwórz istniejący projekt
3. **Znajdź ikonę Figma** - jest to logo Figma w lewym górnym rogu interfejsu (kolorowe logo z literą "F")
4. Kliknij na ikonę Figma → wybierz "Preferences" (Preferencje)
5. Znajdź opcję "Enable Dev Mode MCP Server" i ją zaznacz

**OPCJA B - Przez tryb Dev Mode (łatwiejsza):**
1. Otwórz aplikację Figma na komputerze
2. Utwórz nowy plik lub otwórz istniejący projekt  
3. Naciśnij **Shift + D** aby przełączyć się na tryb Dev Mode
4. Upewnij się, że nic nie jest zaznaczone na canvasie
5. Powinieneś zobaczyć panel "MCP Server" po prawej stronie
6. W panelu MCP Server zmień status z "disabled" na "enabled"

**Rezultat:**
- Na dole ekranu powinien pojawić się komunikat, że serwer działa pod adresem `http://127.0.0.1:3845/sse`

### Krok 3: Sprawdź połączenie w Cursor
1. Uruchom ponownie Cursor
2. Otwórz dowolny projekt
3. Spróbuj zadać pytanie o Figmę w chacie AI

## Pliki konfiguracyjne:

### `mcp.json` (w katalogu projektu):
```json
{
  "figma": {
    "command": "sse",
    "args": ["http://127.0.0.1:3845/sse"],
    "env": {}
  }
}
```

### Ustawienia Cursor (`settings.json`):
Dodano konfigurację MCP do globalnych ustawień Cursor w pliku:
`C:\Users\wacia\AppData\Roaming\Cursor\User\settings.json`

## Co będziesz mógł robić po skonfigurowaniu:
- Pobierać dane projektowe z Figma bezpośrednio w Cursor
- Generować kod na podstawie projektów z Figma
- Wyodrębniać informacje o komponentach, kolorach, typografii
- Synchronizować design system z kodem

## Rozwiązywanie problemów:
- Jeśli serwer MCP nie działa, upewnij się, że Figma jest uruchomiona i projekt jest otwarty
- Sprawdź, czy opcja "Dev Mode" jest włączona w preferencjach Figma
- Uruchom ponownie Cursor po włączeniu serwera MCP w Figma
