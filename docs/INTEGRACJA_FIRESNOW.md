# 🔌 Integracja z FireSnow API - Instrukcja

## 🎯 Co zostało zrobione?

Aplikacja **asystent_java** teraz pobiera dane rezerwacji **bezpośrednio z FireSnow API** zamiast z pliku CSV!

✅ **Automatyczne odświeżanie** - Watchdog restartuje API gdy wykryje zmiany  
✅ **Zawsze aktualne dane** - Bez ręcznego eksportu CSV  
✅ **Fallback do CSV** - Jeśli API nie działa, używa starego CSV  

---

## 📋 Wymagania

### 1. **FireSnow API musi działać**

Upewnij się że działa `FireSnowBridge`:

```powershell
cd C:\FireSnowBridge
.\start-with-watchdog.bat
```

Okno watchdog powinno pokazać:
```
[WATCHDOG] API uruchomione (PID: xxxxx)
[WATCHDOG] Watchdog aktywny
```

**Zostaw to okno włączone!**

---

### 2. **Aplikacja i API na tym samym komputerze**

- ✅ FireSnow API: `http://localhost:8080`
- ✅ Express backend: `http://localhost:3000`
- ✅ React frontend: Serwowany przez Express

---

## 🚀 Uruchomienie

### **Krok 1: Uruchom Watchdog (jeśli jeszcze nie działa)**

```powershell
cd C:\FireSnowBridge
.\start-with-watchdog.bat
```

### **Krok 2: Uruchom aplikację React**

```powershell
cd C:\Users\WYPAS\Desktop\asystent_java
npm run dev
```

LUB w produkcji:

```powershell
npm run build
npm run server
```

### **Krok 3: Otwórz aplikację**

```
http://localhost:3000
```

---

## 🔧 Konfiguracja

### Włączenie/Wyłączenie API FireSnow

Edytuj `server.js` (linia 21):

```javascript
const USE_FIRESNOW_API = true;  // true = API, false = CSV
```

**Zmień na `false`** jeśli chcesz używać starego CSV zamiast API.

---

### Zmiana adresu API

Edytuj `server.js` (linia 20):

```javascript
const FIRESNOW_API_URL = 'http://localhost:8080'; // Zmień jeśli API jest na innym komputerze
```

---

## 📊 Mapowanie danych

### Format FireSnow API → Format aplikacji

| FireSnow API | Aplikacja | Opis |
|--------------|-----------|------|
| `imie` + `nazwisko` | `klient` | Połączone imię i nazwisko |
| `nazwa_sprzetu` | `sprzet` | Pełna nazwa sprzętu |
| `nazwa_sprzetu` (//XX) | `kod` | Wyciągnięty kod z nazwy |
| `data_od` | `od` | Sformatowana data (dd.mm.yyyy HH:mm) |
| `data_do` | `do` | Sformatowana data (dd.mm.yyyy HH:mm) |
| `cena` | `cena` | Cena jako string |
| `rezerwacja_id` | `numer` | ID rezerwacji |
| `telefon` | `telefon` | Numer telefonu |

---

## 🧪 Testowanie

### **Test 1: Sprawdzenie statusu API**

W przeglądarce:
```
http://localhost:3000/api/firesnow/status
```

Powinno zwrócić:
```json
{
  "status": "online",
  "api_url": "http://localhost:8080",
  "api_response": {
    "status": "ok",
    "database": "connected"
  }
}
```

✅ **Jeśli `status: "online"`** → API działa!  
❌ **Jeśli `status: "offline"`** → Sprawdź czy watchdog działa

---

### **Test 2: Pobranie rezerwacji**

W przeglądarce:
```
http://localhost:3000/api/reservations
```

Powinno zwrócić listę rezerwacji w formacie JSON.

**Sprawdź w konsoli serwera:**
```
Server: Pobieranie rezerwacji z FireSnow API: http://localhost:8080
Server: Otrzymano X rezerwacji z FireSnow API
Server: Zmapowano X rezerwacji
Server: Zwracam X rezerwacji z FireSnow API
```

---

### **Test 3: Automatyczne odświeżanie**

1. ✅ Aplikacja React działa (`http://localhost:3000`)
2. ✅ Watchdog działa (okno włączone)
3. **Dodaj rezerwację w FireSnow**
4. **Poczekaj ~10 sekund** (watchdog wykryje zmiany)
5. **Odśwież stronę aplikacji**
6. ✅ **Sprawdź:** Nowa rezerwacja powinna być widoczna!

**Logi watchdog powinny pokazać:**
```
[WATCHDOG] WYKRYTO ZMIANY W BAZIE!
[WATCHDOG] Zatrzymuje API...
[WATCHDOG] Uruchamiam API...
[WATCHDOG] Restart zakonczony. API ma teraz swieze dane!
```

---

## 🔄 Ręczne odświeżenie (opcjonalne)

Jeśli chcesz **natychmiast** odświeżyć dane (bez czekania na watchdog):

### **Opcja A: Endpoint w aplikacji**

```javascript
// Możesz dodać przycisk w React:
const odswiezDane = async () => {
  await fetch('http://localhost:3000/api/firesnow/refresh', {
    method: 'POST'
  });
  
  // Pobierz świeże dane
  const response = await fetch('http://localhost:3000/api/reservations');
  const dane = await response.json();
  console.log('Odświeżone:', dane);
};
```

### **Opcja B: Bezpośrednio w przeglądarce**

```
http://localhost:8080/api/refresh
```

(Ten endpoint jest w FireSnow API, nie w Express)

---

## 🛡️ Fallback do CSV

Jeśli **API FireSnow nie działa**, aplikacja automatycznie przełączy się na czytanie z CSV:

**Logi serwera:**
```
Server: FireSnow API niedostępne, fallback do CSV: ...
Server: Zwracam X rezerwacji z CSV (fallback)
```

**CSV fallback działa gdy:**
- ❌ Watchdog nie jest uruchomiony
- ❌ FireSnow API nie odpowiada
- ❌ Błąd sieci

**Aplikacja nadal działa**, ale dane mogą być nieaktualne (ostatni eksport CSV).

---

## 🐛 Troubleshooting

### **Problem: "FireSnow API niedostępne"**

**Sprawdź:**
1. Czy watchdog działa? (`C:\FireSnowBridge\start-with-watchdog.bat`)
2. Czy widzisz `[WATCHDOG] API uruchomione`?
3. W przeglądarce: `http://localhost:8080/api/health`
   - Powinno zwrócić: `{"status":"ok"}`

**Rozwiązanie:**
- Uruchom watchdog jeśli nie działa
- Sprawdź czy port 8080 nie jest zajęty

---

### **Problem: Dane nie odświeżają się**

**Sprawdź:**
1. Czy watchdog jest włączony?
2. Czy widzisz logi `[WATCHDOG] WYKRYTO ZMIANY W BAZIE!`?
3. Czy odświeżasz stronę aplikacji po restarcie API?

**Rozwiązanie:**
- Poczekaj 5-10 sekund po zmianach w FireSnow
- Sprawdź okno watchdog czy wykryło zmiany
- Jeśli nie wykrywa - sprawdź czy plik `.log` bazy się zmienia

---

### **Problem: Aplikacja pokazuje stare dane z CSV**

**To znaczy że:**
- FireSnow API nie działa (fallback do CSV)

**Rozwiązanie:**
1. Sprawdź status: `http://localhost:3000/api/firesnow/status`
2. Uruchom watchdog jeśli nie działa
3. Restart serwera Express: Ctrl+C → `npm run server`

---

### **Problem: Błąd "AbortSignal.timeout is not a function"**

**To oznacza starą wersję Node.js** (< 17.3.0)

**Rozwiązanie:**
Zaktualizuj Node.js do najnowszej wersji:
- https://nodejs.org/

LUB zamień w `server.js`:
```javascript
// Zamień:
signal: AbortSignal.timeout(5000)

// Na:
// signal: AbortSignal.timeout(5000)  // Zakomentowane
```

---

## 📁 Struktura plików

```
C:\Users\WYPAS\Desktop\asystent_java\
├── server.js                    ← ✅ ZMODYFIKOWANY (integracja API)
├── INTEGRACJA_FIRESNOW.md      ← 📄 TEN PLIK
├── package.json
├── src/
│   └── ... (React components)
└── public/
    └── data/
        └── rezerwacja.csv       ← Fallback (jeśli API nie działa)

C:\FireSnowBridge\
├── start-with-watchdog.bat      ← ✅ URUCHOM TO
├── watchdog.ps1
├── FireSnowBridge.jar
└── WATCHDOG_INSTRUKCJA.md
```

---

## ✅ Checklist uruchomienia

- [ ] Watchdog działa (`start-with-watchdog.bat`)
- [ ] API odpowiada: `http://localhost:8080/api/health`
- [ ] Express działa: `npm run server` lub `npm run dev`
- [ ] Status API OK: `http://localhost:3000/api/firesnow/status`
- [ ] Rezerwacje ładują się: `http://localhost:3000/api/reservations`
- [ ] Test automatycznego odświeżania (dodaj rezerwację → poczekaj 10s → odśwież stronę)

---

## 🎉 Gotowe!

Aplikacja teraz automatycznie pobiera dane z FireSnow!

**Korzyści:**
- ✅ Nie musisz eksportować CSV ręcznie
- ✅ Dane zawsze aktualne (watchdog + API)
- ✅ Bezpieczne (tylko odczyt, nie modyfikuje FireSnow)
- ✅ Niezawodne (fallback do CSV jeśli API nie działa)

---

**Utworzono:** 2025-10-22  
**Wersja:** 1.0  
**Autor:** AI Assistant (Cursor)



