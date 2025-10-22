# 🔌 FireSnow Bridge API

**Prosty REST API do odczytu danych z bazy FireSnow**

---

## 📋 Co to jest?

FireSnow Bridge to mały program w Javie, który:
- ✅ Łączy się z bazą danych FireSnow (READ-ONLY)
- ✅ Udostępnia dane przez REST API (JSON)
- ✅ Umożliwia automatyczne pobieranie rezerwacji
- ✅ **Nie modyfikuje** FireSnow - bezpieczny!

**Zamiast:** Generować CSV → Kopiować → Importować  
**Teraz:** Dane zawsze aktualne automatycznie! 🎉

---

## 🖥️ Architektura

```
KOMPUTER 1 (Serwer FireSnow)
│
├── FireSnow (oryginalny program)
│   └── Baza HSQLDB: 192.168.8.48:11099
│
└── FireSnow Bridge API ← TU INSTALUJEMY
    └── REST API: http://192.168.8.48:8080
        ├── GET /api/health
        ├── GET /api/rezerwacje/aktywne
        └── GET /api/narty/zarezerwowane

            ↓ (HTTP/JSON)

KOMPUTER 3 (Twój prywatny)
│
└── Twoja aplikacja React
    └── Express backend
```

---

## 📦 Instalacja

### **KROK 1: Przygotuj pliki**

Na **tym komputerze** (gdzie jesteś teraz):

```
FireSnowBridge/
├── config.properties         ← Konfiguracja
├── start.bat                 ← Uruchomienie
├── compile.bat               ← Kompilacja (jeśli potrzeba)
├── src/
│   └── FireSnowBridge.java   ← Kod źródłowy
└── lib/
    └── hsqldb.jar            ← MUSISZ SKOPIOWAĆ!
```

**WAŻNE:** Skopiuj plik `hsqldb.jar` z FireSnow:

```
Z: C:\FireSoft\FireSnow21\lib\hsqldb.jar
Do: FireSnowBridge\lib\hsqldb.jar
```

---

### **KROK 2: Skompiluj program**

**Na tym komputerze** (lub na serwerze jeśli ma javac):

```cmd
cd FireSnowBridge
compile.bat
```

To stworzy plik `FireSnowBridge.jar`

**LUB** - jeśli nie masz javac (kompilatora):
- Ja już stworzyłem `FireSnowBridge.jar` - jest gotowy!
- Pomiń ten krok

---

### **KROK 3: Skopiuj na serwer**

Skopiuj **cały folder** `FireSnowBridge` na **KOMPUTER 1** (serwer FireSnow):

```
Pendrive / Sieć → KOMPUTER 1

Docelowa lokalizacja:
C:\FireSnowBridge\
```

Po skopiowaniu struktura powinna wyglądać tak:

```
C:\FireSnowBridge\
├── config.properties
├── start.bat
├── FireSnowBridge.jar
└── lib\
    └── hsqldb.jar
```

---

### **KROK 4: Sprawdź konfigurację**

Na **KOMPUTERZE 1**, otwórz plik `config.properties` i sprawdź:

```properties
db.host=192.168.8.48      ← Adres serwera FireSnow
db.port=11099             ← Port bazy danych
db.name=FireSport_database_4
db.user=SA
db.password=              ← Puste hasło
api.port=8080             ← Port API
```

**Jeśli coś jest inne - popraw!**

---

### **KROK 5: Uruchom API**

Na **KOMPUTERZE 1**, kliknij dwukrotnie:

```
start.bat
```

Okienko CMD otworzy się i zobaczysz:

```
===========================================
✓ FireSnow Bridge API is running!
===========================================

API URL: http://localhost:8080

Available endpoints:
  GET /api/health                    - Check API status
  GET /api/rezerwacje/aktywne       - Get active reservations
  GET /api/narty/zarezerwowane      - Get reserved skis

Press Ctrl+C to stop the server
===========================================
```

**✅ DZIAŁA!** Zostaw to okno otwarte (zminimalizuj).

---

### **KROK 6: Przetestuj API**

Na **KOMPUTERZE 1** (lub z innego komputera w sieci), otwórz przeglądarkę:

```
http://192.168.8.48:8080/api/health
```

Powinno zwrócić:
```json
{
  "status": "ok",
  "database": "connected",
  "message": "FireSnow Bridge API is running"
}
```

**Jeśli widzisz to - SUKCES!** 🎉

---

## 🔗 Integracja z Twoją aplikacją

### **W Express backe

ndzie (KOMPUTER 3):**

Zobacz: [`EXPRESS_INTEGRATION.md`](EXPRESS_INTEGRATION.md)

Dodaj endpoint:
```javascript
app.get('/api/rezerwacje', async (req, res) => {
  const response = await fetch('http://192.168.8.48:8080/api/rezerwacje/aktywne');
  const data = await response.json();
  res.json(data);
});
```

### **W React frontendzie:**

Zobacz: [`REACT_EXAMPLES.md`](REACT_EXAMPLES.md)

Użyj custom hook:
```typescript
const { data, loading, error } = useAktywneRezerwacje();
```

---

## 📡 Dostępne endpointy

### `GET /api/health`
Sprawdza czy API działa i czy jest połączenie z bazą.

**Odpowiedź:**
```json
{
  "status": "ok",
  "database": "connected",
  "message": "FireSnow Bridge API is running"
}
```

---

### `GET /api/rezerwacje/aktywne`
Zwraca listę aktywnych rezerwacji (data_do > teraz).

**Odpowiedź:**
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

### `GET /api/narty/zarezerwowane`
Zwraca listę nart które są obecnie zarezerwowane.

**Odpowiedź:**
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

## 🔧 Rozwiązywanie problemów

### **Problem: "Cannot connect to database"**

**Sprawdź:**
1. Czy FireSnow działa na KOMPUTERZE 1?
2. Czy `config.properties` ma dobry adres IP?
3. Czy port 11099 jest otwarty?

**Test:**
```cmd
telnet 192.168.8.48 11099
```

---

### **Problem: "Port 8080 already in use"**

**Rozwiązanie:**
Zmień port w `config.properties`:
```properties
api.port=8081
```

---

### **Problem: Aplikacja nie widzi API**

**Sprawdź:**
1. Czy start.bat działa na KOMPUTERZE 1?
2. Czy firewall nie blokuje portu 8080?
3. Czy adres IP w Express jest dobry?

---

## 🔒 Bezpieczeństwo

- ✅ API działa w trybie **READ-ONLY**
- ✅ **Nie modyfikuje** danych w FireSnow
- ✅ **Nie wpływa** na działanie FireSnow
- ✅ Można wyłączyć w każdej chwili (zamknij okno)

---

## 📁 Struktura plików

```
FireSnowBridge/
├── README.md                      ← Ten plik
├── EXPRESS_INTEGRATION.md         ← Jak dodać do Express
├── REACT_EXAMPLES.md              ← Przykłady React
│
├── config.properties              ← Konfiguracja
├── start.bat                      ← Uruchomienie
├── compile.bat                    ← Kompilacja
│
├── FireSnowBridge.jar             ← Program (skompilowany)
│
├── src/
│   └── FireSnowBridge.java        ← Kod źródłowy
│
└── lib/
    └── hsqldb.jar                 ← Biblioteka HSQLDB (skopiuj z FireSnow!)
```

---

## ❓ FAQ

**Q: Czy to bezpieczne dla FireSnow?**  
A: TAK! API tylko czyta dane, nic nie zmienia.

**Q: Co jeśli FireSnow się aktualizuje?**  
A: API nadal działa - czyta z tej samej bazy.

**Q: Czy mogę uruchomić na innym komputerze?**  
A: TAK! Ale zmień `db.host` w config.properties na adres IP serwera.

**Q: Czy muszę uruchamiać to za każdym razem?**  
A: Tak, lub dodaj do autostartu Windows.

**Q: Ile to zajmuje zasobów?**  
A: Bardzo mało - ~50MB RAM, prawie 0% CPU.

---

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź logi w oknie CMD
2. Przetestuj /api/health
3. Sprawdź czy FireSnow działa
4. Sprawdź `config.properties`

---

## 🎉 Gotowe!

**FireSnow Bridge API działa!**

Teraz Twoja aplikacja może pobierać dane automatycznie, bez CSV! 🚀

**Nie zapomnij:** Zostaw `start.bat` włączony na KOMPUTERZE 1 (zminimalizuj okno).

