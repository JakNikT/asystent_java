# 🏠 Instrukcja: Testowanie FireSnow Bridge API lokalnie (w domu)

**Bez połączenia z serwerem FireSnow**

---

## 📌 Cel

Ta instrukcja pokazuje jak uruchomić FireSnow Bridge API na swoim komputerze domowym, używając kopii bazy danych z serwera FireSnow. Dzięki temu możesz testować API bez dostępu do sieci firmowej.

---

## ⚠️ WAŻNE - Przeczytaj najpierw!

✅ **Co będzie działać:**
- API będzie w pełni funkcjonalne
- Wszystkie endpointy będą odpowiadać
- Możesz testować integrację z React/Express
- Bezpieczne - tryb READ-ONLY

❌ **Ograniczenia:**
- Dane będą "zamrożone" z momentu kopiowania
- Nie zobaczysz nowych rezerwacji dodanych po skopiowaniu
- Aby zaktualizować dane, musisz ponownie skopiować pliki z serwera

---

## 📋 KROK 1: Skopiuj pliki bazy danych z serwera

### Na serwerze FireSnow (KOMPUTER 1):

1. Przejdź do folderu bazy danych:
   ```
   C:\FireSoft\FireSnowServer20\database\
   ```

2. Znajdź i skopiuj **WSZYSTKIE** pliki zaczynające się od `FireSport_database_4`:
   ```
   FireSport_database_4.properties
   FireSport_database_4.script
   FireSport_database_4.data       (jeśli istnieje)
   FireSport_database_4.log        (jeśli istnieje)
   FireSport_database_4.backup     (jeśli istnieje)
   ```
   
   **UWAGA:** NIE kopiuj pliku `FireSport_database_4.lck` - to plik blokady!

3. Skopiuj je na pendrive lub przez sieć

---

## 📂 KROK 2: Utwórz folder na swoim komputerze

### Na swoim komputerze domowym:

1. Utwórz folder dla testowej bazy danych, np.:
   ```
   D:\FireSnow_Test\database\
   ```
   
   Możesz użyć innej lokalizacji, np.:
   ```
   C:\Users\TwojaNazwa\FireSnow_Test\database\
   ```

2. Wklej wszystkie skopiowane pliki do tego folderu

3. Upewnij się, że struktura wygląda tak:
   ```
   D:\FireSnow_Test\database\
   ├── FireSport_database_4.properties
   ├── FireSport_database_4.script
   └── (inne pliki FireSport_database_4.*)
   ```

---

## ⚙️ KROK 3: Zmień konfigurację FireSnowBridge

1. W folderze projektu, otwórz plik:
   ```
   FireSnowBridge\config.properties
   ```

2. **PRZED zmianą** (oryginalna konfiguracja dla serwera):
   ```properties
   db.url=jdbc:hsqldb:file:C:/FireSoft/FireSnowServer20/database/FireSport_database_4;readonly=true;ifexists=true
   db.user=SA
   db.password=
   api.port=8080
   ```

3. **PO ZMIANIE** (lokalna konfiguracja):
   ```properties
   db.url=jdbc:hsqldb:file:D:/FireSnow_Test/database/FireSport_database_4;readonly=true;ifexists=true
   db.user=SA
   db.password=
   api.port=8080
   ```
   
   **WAŻNE:** Zmień ścieżkę `D:/FireSnow_Test/database/` na tę, którą utworzyłeś w KROKU 2!
   
   **UWAGA:** Używaj ukośników "/" (nie odwrotnych "\\") nawet w Windows!

4. Zapisz plik

---

## 🚀 KROK 4: Uruchom FireSnow Bridge API

1. Otwórz terminal/cmd w folderze projektu

2. Przejdź do folderu FireSnowBridge:
   ```cmd
   cd FireSnowBridge
   ```

3. Uruchom API:
   ```cmd
   start.bat
   ```

4. Powinno się otworzyć okno z komunikatem:
   ```
   ===========================================
   ✓ FireSnow Bridge API is running!
   ===========================================
   
   API URL: http://localhost:8080
   
   Available endpoints:
     GET /api/health                    - Check API status
     GET /api/rezerwacje/aktywne       - Get active reservations
     GET /api/narty/zarezerwowane      - Get reserved skis
     GET /api/wypozyczenia/aktywne     - Get active rentals
   
   Press Ctrl+C to stop the server
   ===========================================
   ```

5. **✅ DZIAŁA!** Zostaw to okno otwarte (możesz je zminimalizować)

---

## 🧪 KROK 5: Przetestuj API

### Test 1: Health Check

Otwórz przeglądarkę i wejdź na:
```
http://localhost:8080/api/health
```

**Oczekiwana odpowiedź:**
```json
{
  "status": "ok",
  "database": "connected",
  "message": "FireSnow Bridge API is running"
}
```

✅ Jeśli widzisz to - API działa poprawnie!

---

### Test 2: Aktywne rezerwacje

W przeglądarce wejdź na:
```
http://localhost:8080/api/rezerwacje/aktywne
```

**Oczekiwana odpowiedź:**
```json
[
  {
    "rezerwacja_id": 85748,
    "nazwa_sprzetu": "NARTY NORDICA DOBERMANN SLR 155cm /2025 //01",
    "data_od": "2026-02-13 11:00:00.000000",
    "data_do": "2026-02-23 19:00:00.000000",
    "cena": 378.0,
    "obiekt_id": 82472,
    "klient_id": 20886,
    "imie": "Jan",
    "nazwisko": "Kowalski",
    "telefon": "509-706-651"
  }
]
```

---

### Test 3: Zarezerwowane narty

W przeglądarce wejdź na:
```
http://localhost:8080/api/narty/zarezerwowane
```

**Oczekiwana odpowiedź:**
```json
[
  {
    "obiekt_id": 82472,
    "nazwa": "NARTY NORDICA DOBERMANN SLR 155cm /2025 //01",
    "kod": "N001"
  }
]
```

---

### Test 4: Aktywne wypożyczenia

W przeglądarce wejdź na:
```
http://localhost:8080/api/wypozyczenia/aktywne
```

---

## 🔧 Rozwiązywanie problemów

### ❌ Problem: "Cannot connect to database"

**Możliwe przyczyny:**
1. Zła ścieżka w `config.properties`
2. Brak plików bazy danych
3. Nieprawidłowe uprawnienia do plików

**Rozwiązanie:**
1. Sprawdź czy ścieżka w `config.properties` jest poprawna
2. Sprawdź czy pliki `FireSport_database_4.*` są w folderze
3. Upewnij się, że używasz "/" zamiast "\\" w ścieżce
4. Sprawdź logi w oknie CMD - zobaczysz szczegóły błędu

---

### ❌ Problem: "Port 8080 already in use"

**Rozwiązanie:**
Zmień port w `config.properties`:
```properties
api.port=8081
```
Następnie pamiętaj używać nowego portu w testach: `http://localhost:8081`

---

### ❌ Problem: "Database file not found"

**Rozwiązanie:**
1. Sprawdź czy ścieżka w `config.properties` wskazuje na istniejący folder
2. Sprawdź czy pliki zostały poprawnie skopiowane
3. Sprawdź czy nazwa pliku to dokładnie `FireSport_database_4` (bez rozszerzenia w ścieżce)

---

### ❌ Problem: API zwraca puste tablice []

**To normalne jeśli:**
- Nie ma aktywnych rezerwacji w skopiowanej bazie danych
- Wszystkie rezerwacje już wygasły

**Test:**
Sprawdź endpoint `/api/health` - jeśli działa, to API jest OK, po prostu nie ma danych do wyświetlenia.

---

## 🔄 Aktualizacja danych testowych

Gdy chcesz przetestować z nowszymi danymi:

1. Zamknij FireSnow Bridge (Ctrl+C w oknie CMD)
2. Skopiuj nowe pliki bazy danych z serwera (KROK 1)
3. Zastąp stare pliki w folderze lokalnym
4. Uruchom ponownie API (KROK 4)

---

## 💾 BACKUP - Przywracanie konfiguracji dla serwera

Gdy skończysz testowanie i chcesz wrócić do pracy z serwerem:

1. Otwórz `FireSnowBridge\config.properties`

2. Przywróć oryginalną konfigurację:
   ```properties
   db.url=jdbc:hsqldb:file:C:/FireSoft/FireSnowServer20/database/FireSport_database_4;readonly=true;ifexists=true
   db.user=SA
   db.password=
   api.port=8080
   ```

3. Zapisz i uruchom ponownie API

---

## 📊 Porównanie: Serwer vs Lokalnie

| Aspekt | Na serwerze FireSnow | Lokalnie (w domu) |
|--------|---------------------|-------------------|
| Połączenie sieciowe | Wymagane | NIE wymagane |
| Dane | Zawsze aktualne | Z momentu kopiowania |
| Testowanie | Wymaga dostępu do sieci | Zawsze dostępne |
| Bezpieczeństwo | Produkcyjne | Izolowane |
| Prędkość | Zależy od sieci | Bardzo szybkie (lokalnie) |

---

## 🎯 Przypadki użycia

### ✅ Kiedy używać testowania lokalnego:

- 🏠 Pracujesz z domu bez VPN/dostępu do serwera
- 🧪 Testujesz nowe funkcje w aplikacji React/Express
- 📚 Uczysz się API i eksplorujesz dane
- 🐛 Debugujesz problemy bez wpływu na serwer produkcyjny
- ⚡ Potrzebujesz szybkich testów bez opóźnień sieciowych

### ❌ Kiedy NIE używać testowania lokalnego:

- 📊 Potrzebujesz aktualnych danych na żywo
- 🔄 Testujesz synchronizację w czasie rzeczywistym
- 👥 Testujesz współbieżność (wielu użytkowników jednocześnie)
- ✅ Ostateczne testy przed wdrożeniem na produkcję

---

## 🎓 Dodatkowe informacje

### Jak działa baza HSQLDB (FireSnow)?

FireSnow używa bazy danych HSQLDB w trybie "file":
- Dane są przechowywane w plikach na dysku
- Nie wymaga osobnego serwera bazy danych
- Można ją skopiować jak zwykłe pliki
- Tryb READ-ONLY zapewnia bezpieczeństwo

### Co to znaczy "readonly=true"?

To parametr w URL połączenia, który:
- Otwiera bazę tylko do odczytu
- Uniemożliwia jakiekolwiek zmiany
- Zapewnia bezpieczeństwo danych
- Pozwala na współdzielenie bazy między aplikacjami

---

## ✅ Checklist - Czy wszystko działa?

Po skonfigurowaniu sprawdź:

- [ ] Pliki bazy danych są skopiowane
- [ ] Folder docelowy istnieje
- [ ] `config.properties` ma poprawną ścieżkę
- [ ] `start.bat` uruchamia się bez błędów
- [ ] `/api/health` zwraca status "ok"
- [ ] `/api/rezerwacje/aktywne` zwraca dane (lub pustą tablicę)
- [ ] Twoja aplikacja React/Express może połączyć się z API

---

## 🎉 Gotowe!

Teraz możesz testować swoją aplikację lokalnie, bez dostępu do serwera FireSnow!

**Pamiętaj:**
- Dane są z momentu kopiowania - nie będą się aktualizować
- To środowisko testowe - używaj do developmentu
- Na produkcji zawsze używaj połączenia z serwerem
- Zamknij API (Ctrl+C) gdy skończysz testowanie

---

## 📞 Potrzebujesz pomocy?

Jeśli coś nie działa:

1. **Sprawdź logi** - okno CMD pokazuje szczegółowe komunikaty
2. **Przetestuj ścieżki** - upewnij się, że folder i pliki istnieją
3. **Sprawdź config.properties** - najczęstszy źródło problemów
4. **Test health check** - `/api/health` powinien zawsze działać

---

**Wersja:** 1.0  
**Data:** 2025-10-27  
**Autor:** AI Assistant

