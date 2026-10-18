# 🔌 Integracja z Express Backend

## Jak dodać FireSnow Bridge do swojego Express backendu

---

## ✅ KROK 1: Dodaj endpoint w Express

W swoim pliku głównym Express (np. `server.js` lub `index.js`), dodaj:

```javascript
// ===== FireSnow Bridge Integration =====

const FIRESNOW_API = 'http://192.168.8.48:8080'; // Adres IP komputera z API

// Endpoint: Pobierz aktywne rezerwacje
app.get('/api/rezerwacje', async (req, res) => {
  console.log('server.js: Fetching active reservations from FireSnow...');
  
  try {
    const response = await fetch(`${FIRESNOW_API}/api/rezerwacje/aktywne`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`server.js: Received ${data.length} reservations`);
    
    res.json(data);
    
  } catch (error) {
    console.error('server.js: Error fetching from FireSnow:', error);
    res.status(500).json({ 
      error: 'Nie można pobrać rezerwacji',
      details: error.message 
    });
  }
});

// Endpoint: Pobierz zarezerwowane narty
app.get('/api/narty/zarezerwowane', async (req, res) => {
  console.log('server.js: Fetching reserved skis from FireSnow...');
  
  try {
    const response = await fetch(`${FIRESNOW_API}/api/narty/zarezerwowane`);
    
    if (!response.ok) {
      throw new Error(`FireSnow API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`server.js: Received ${data.length} reserved skis`);
    
    res.json(data);
    
  } catch (error) {
    console.error('server.js: Error fetching from FireSnow:', error);
    res.status(500).json({ 
      error: 'Nie można pobrać nart',
      details: error.message 
    });
  }
});

// Endpoint: Sprawdź status połączenia z FireSnow
app.get('/api/firesnow/status', async (req, res) => {
  try {
    const response = await fetch(`${FIRESNOW_API}/api/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Cannot connect to FireSnow Bridge API' 
    });
  }
});
```

---

## 📝 KROK 2: Zmień adres IP (jeśli potrzeba)

Jeśli komputer z FireSnow Bridge ma **inny adres IP**, zmień linię:

```javascript
const FIRESNOW_API = 'http://192.168.8.48:8080';
//                          ^^^^^^^^^^^^^^^^
//                          ZMIEŃ NA WŁAŚCIWY IP
```

---

## 🧪 KROK 3: Przetestuj

### **Test 1: Sprawdź status**

```bash
curl http://localhost:3000/api/firesnow/status
```

Powinno zwrócić:
```json
{
  "status": "ok",
  "database": "connected",
  "message": "FireSnow Bridge API is running"
}
```

### **Test 2: Pobierz rezerwacje**

```bash
curl http://localhost:3000/api/rezerwacje
```

Zwróci listę aktywnych rezerwacji w formacie JSON.

---

## 📊 Format odpowiedzi

### `/api/rezerwacje` - Aktywne rezerwacje

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

### `/api/narty/zarezerwowane` - Zarezerwowane narty

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

## ⚠️ Obsługa błędów

**Jeśli FireSnow Bridge nie działa:**

```javascript
{
  "error": "Nie można pobrać rezerwacji",
  "details": "fetch failed"
}
```

**Co zrobić:**
1. Sprawdź czy FireSnow Bridge działa (start.bat na komputerze 1)
2. Sprawdź czy adres IP jest poprawny
3. Sprawdź czy firewall nie blokuje portu 8080

---

## 🔥 Gotowe!

Teraz Twój Express może pobierać dane z FireSnow automatycznie!

**Nie trzeba już:**
- ❌ Generować CSV w FireSnow
- ❌ Ręcznie kopiować plików
- ❌ Importować danych

**Wszystko dzieje się automatycznie!** ✅

