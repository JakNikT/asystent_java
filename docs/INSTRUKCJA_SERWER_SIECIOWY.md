# Instrukcja Serwera Sieciowego - Asystent Nart

## Przegląd

Ta instrukcja opisuje jak uruchomić aplikację Asystent Nart w trybie serwera sieciowego, umożliwiając współdzielenie rezerwacji między wieloma komputerami w sieci lokalnej.

## Architektura

- **Serwer główny**: Komputer z uruchomionym `npm run server` (może też być używany jako klient)
- **Klienty**: Przeglądarki na innych komputerach łączące się przez `http://[IP]:3000`
- **Backend**: Express.js serwujący aplikację React + API REST do rezerwacji
- **Storage**: Plik CSV (`public/data/rezerwacja.csv`) jako źródło danych

## Wymagania Wstępne

⚠️ **WAŻNE**: Przed uruchomieniem aplikacji musisz mieć zainstalowane:

### Node.js (zawiera npm)

#### Metoda 1: Automatyczna instalacja (Zalecane)

Użyj dołączonego pliku `install-nodejs.bat`:
1. **Kliknij prawym przyciskiem** na `install-nodejs.bat`
2. Wybierz **"Uruchom jako administrator"**
3. Poczekaj na zakończenie instalacji
4. **Zrestartuj komputer**

#### Metoda 2: Instalacja przez wiersz poleceń

Otwórz **PowerShell jako Administrator** i wpisz:

```powershell
winget install OpenJS.NodeJS.LTS
```

Po instalacji **zrestartuj komputer**.

#### Metoda 3: Ręczna instalacja

1. Pobierz Node.js z: **https://nodejs.org/**
2. Wybierz wersję **LTS (Long Term Support)** - zalecana
3. Uruchom instalator i postępuj zgodnie z instrukcjami
4. Po instalacji **zrestartuj komputer**

### Weryfikacja instalacji:

Otwórz PowerShell lub CMD i wpisz:

```powershell
node --version
npm --version
```

Jeśli zobaczysz numery wersji (np. `v20.10.0` i `10.2.3`), wszystko jest OK! ✅

**Jeśli zobaczysz błąd "npm is not recognized":**
- Node.js nie jest zainstalowany LUB
- Musisz zrestartować komputer po instalacji LUB
- Musisz dodać Node.js do PATH (zazwyczaj robi to instalator automatycznie)

## Instalacja i Uruchomienie

### Krok 1: Przygotowanie środowiska

```powershell
cd "C:\Users\wacia\Desktop\asystent v9"
npm install
```

### Krok 2: Budowanie aplikacji

```powershell
npm run build
```

### Krok 3: Instalacja zależności serwera

```powershell
npm install express cors
```

### Krok 4: Uruchomienie serwera

```powershell
npm run server
```

Po uruchomieniu zobaczysz:

```
🚀 Serwer asystenta nart uruchomiony na porcie 3000
📱 Dostęp lokalny: http://localhost:3000
🌐 Dostęp sieciowy: http://[IP_KOMPUTERA]:3000
📊 API dostępne pod: http://localhost:3000/api/
💾 Plik rezerwacji: C:\Users\wacia\Desktop\asystent v9\public\data\rezerwacja.csv

Aby znaleźć adres IP komputera, uruchom: ipconfig
```

## Znajdowanie Adresu IP Komputera

### Windows (PowerShell/CMD):

```powershell
ipconfig
```

Szukaj sekcji "Ethernet adapter" lub "Wi-Fi adapter" i znajdź:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.105
```

### Przykład:
Jeśli Twój adres IP to `192.168.1.105`, to:
- **Lokalny dostęp**: `http://localhost:3000`
- **Dostęp sieciowy**: `http://192.168.1.105:3000`

## Użycie

### Na komputerze głównym (serwer):

1. Uruchom serwer: `npm run server`
2. Otwórz przeglądarkę: `http://localhost:3000`
3. Pracuj normalnie - dodawaj rezerwacje, przeglądaj narty

### Na innych komputerach w sieci:

1. Otwórz przeglądarkę
2. Wejdź na: `http://[IP_SERWERA]:3000`
3. Przykład: `http://192.168.1.105:3000`
4. Wszystkie dane będą synchronizowane z serwerem

## Funkcjonalności

### ✅ Co działa w trybie serwera:

- **Synchronizacja danych**: Wszyscy użytkownicy widzą te same rezerwacje
- **Czas rzeczywisty**: Zmiany są widoczne natychmiast na wszystkich komputerach
- **Dodawanie rezerwacji**: Nowe rezerwacje są zapisywane do CSV
- **Edycja rezerwacji**: Modyfikacje są synchronizowane
- **Usuwanie rezerwacji**: Usunięcia są widoczne dla wszystkich
- **Sprawdzanie dostępności**: System 3-kolorowy działa poprawnie
- **Format FireFnow**: Automatyczna konwersja CSV

### ⚠️ Ograniczenia:

- **Serwer musi być uruchomiony**: Bez serwera aplikacja nie działa
- **Jedna instancja serwera**: Tylko jeden komputer może być serwerem
- **Sieć lokalna**: Komputery muszą być w tej samej sieci

## API Endpoints

Serwer udostępnia następujące endpointy API:

- `GET /api/reservations` - Pobierz wszystkie rezerwacje
- `POST /api/reservations` - Dodaj nową rezerwację
- `PUT /api/reservations/:id` - Zaktualizuj rezerwację
- `DELETE /api/reservations/:id` - Usuń rezerwację
- `GET /api/health` - Sprawdź status serwera

## Troubleshooting

### Problem: "npm is not recognized as an internal or external command"

**Przyczyna:** Node.js nie jest zainstalowany na tym komputerze.

**Rozwiązanie 1: Użyj automatycznego instalatora**
```powershell
# Uruchom install-nodejs.bat jako Administrator
```

**Rozwiązanie 2: Zainstaluj przez PowerShell**
```powershell
# Otwórz PowerShell jako Administrator
winget install OpenJS.NodeJS.LTS
```

**Rozwiązanie 3: Ręczna instalacja**
1. Pobierz Node.js: https://nodejs.org/
2. Zainstaluj wersję LTS
3. **Zrestartuj komputer** po instalacji
4. Sprawdź instalację: `node --version` i `npm --version`

⚠️ **Uwaga**: Każdy komputer, na którym chcesz uruchomić serwer, musi mieć zainstalowany Node.js!

### Problem: Nie można połączyć się z serwerem

**Rozwiązania:**
1. Sprawdź czy serwer jest uruchomiony
2. Sprawdź adres IP: `ipconfig`
3. Sprawdź firewall Windows
4. Upewnij się, że komputery są w tej samej sieci

### Problem: Firewall blokuje połączenia

**Rozwiązanie:**
1. Otwórz "Windows Defender Firewall"
2. Kliknij "Zezwól aplikacji przez zaporę"
3. Dodaj Node.js lub port 3000 do wyjątków

### Problem: Błąd "Cannot find module 'express'"

**Rozwiązanie:**
```powershell
npm install express cors
```

### Problem: Port 3000 jest zajęty

**Rozwiązanie:**
1. Znajdź proces używający portu 3000:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Zabij proces:
   ```powershell
   taskkill /PID [NUMER_PID] /F
   ```

### Problem: Dane nie synchronizują się

**Rozwiązania:**
1. Sprawdź czy serwer działa: `http://localhost:3000/api/health`
2. Sprawdź konsolę przeglądarki (F12) pod kątem błędów
3. Restart serwera: `Ctrl+C` i ponownie `npm run server`

## Skrypty npm

- `npm run dev` - Tryb deweloperski (lokalny)
- `npm run build` - Budowanie aplikacji
- `npm run server` - Uruchomienie serwera sieciowego
- `npm run start` - Uruchomienie serwera (produkcja, `tsx server.ts`)
- `npm run typecheck` - Sprawdzenie typów frontendu i serwera

## Bezpieczeństwo

⚠️ **Uwaga**: Ten serwer jest przeznaczony tylko do sieci lokalnej. Nie uruchamiaj go w sieci publicznej bez odpowiednich zabezpieczeń.

## Wsparcie

W przypadku problemów:
1. Sprawdź logi serwera w terminalu
2. Sprawdź konsolę przeglądarki (F12)
3. Upewnij się, że wszystkie kroki instalacji zostały wykonane poprawnie


