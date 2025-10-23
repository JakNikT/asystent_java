# 🔄 FireSnow Bridge Watchdog - Instrukcja

## Co to jest?

**Watchdog** to automatyczny system który:
- ✅ Uruchamia API
- ✅ Monitoruje plik bazy danych FireSnow (`.log`)
- ✅ Wykrywa kiedy FireSnow zapisuje dane
- ✅ **Automatycznie restartuje API** aby pobrać świeże dane
- ✅ Działa w tle, bez Twojej interwencji

**Nie musisz już ręcznie restartować API!** 🎉

---

## 🚀 Jak uruchomić?

### **Sposób 1: Podwójne kliknięcie (najprostszy)**

1. Kliknij dwukrotnie: **`start-with-watchdog.bat`**
2. Gotowe! Watchdog działa w tle

### **Sposób 2: Z PowerShell**

```powershell
cd C:\FireSnowBridge
.\start-with-watchdog.bat
```

---

## 📺 Co zobaczysz?

```
========================================
  FireSnow Bridge API Watchdog
  Auto-restart on database changes
========================================

[WATCHDOG] Monitoruje: C:\FireSoft\FireSnowServer20\database\FireSport_database_4.log
[WATCHDOG] Sprawdzam co 5 sekund

[WATCHDOG] 15:30:45 - Uruchamiam API...
[WATCHDOG] 15:30:48 - API uruchomione (PID: 12345)

[WATCHDOG] 15:30:48 - Watchdog aktywny. Nacisnij Ctrl+C aby zakonczyc.
```

**Zostaw to okno otwarte!** (możesz zminimalizować)

---

## 🔄 Co się dzieje gdy zmienisz dane w FireSnow?

```
[WATCHDOG] 15:35:20 - WYKRYTO ZMIANY W BAZIE!
[WATCHDOG] Poprzednia modyfikacja: 2025-10-22 15:30:45
[WATCHDOG] Aktualna modyfikacja:   2025-10-22 15:35:20

[WATCHDOG] 15:35:20 - Zatrzymuje API (PID: 12345)...
[WATCHDOG] 15:35:21 - API zatrzymane
[WATCHDOG] 15:35:21 - Uruchamiam API...
[WATCHDOG] 15:35:24 - API uruchomione (PID: 67890)

[WATCHDOG] 15:35:24 - Restart zakonczony. API ma teraz swieze dane!
```

**Restart trwa ~3 sekundy**

---

## ⚙️ Konfiguracja

Jeśli chcesz zmienić ustawienia, edytuj `watchdog.ps1`:

### **1. Zmiana interwału sprawdzania**
```powershell
$CHECK_INTERVAL = 5  # Zmień na 10 aby sprawdzać co 10 sekund
```

### **2. Zmiana ścieżki do bazy**
```powershell
$DB_LOG_FILE = "C:\FireSoft\FireSnowServer20\database\FireSport_database_4.log"
```

---

## 🛑 Jak zatrzymać?

1. Przejdź do okna watchdog
2. Naciśnij **Ctrl+C**
3. Watchdog zatrzyma API i zakończy działanie

---

## 🔍 Troubleshooting

### **Problem: "Nie znaleziono pliku bazy"**

**Rozwiązanie:** Sprawdź ścieżkę w `watchdog.ps1`:
```powershell
$DB_LOG_FILE = "C:\FireSoft\FireSnowServer20\database\FireSport_database_4.log"
```

Upewnij się że:
- FireSnow jest zainstalowany w `C:\FireSoft\`
- Plik `.log` istnieje

---

### **Problem: "API zostało zatrzymane! Uruchamiam ponownie..."**

To **normalne** jeśli:
- API crashnęło z jakiegoś powodu
- Watchdog automatycznie je uruchomi ponownie

Jeśli to się powtarza co kilka sekund → sprawdź logi API (mogą być błędy)

---

### **Problem: Watchdog nie wykrywa zmian**

**Możliwe przyczyny:**
1. FireSnow nie zapisuje do pliku `.log` natychmiast
2. FireSnow używa CHECKPOINT rzadko

**Rozwiązanie:**
- Zmniejsz `$CHECK_INTERVAL` do 3 sekund
- LUB sprawdź czy timestamp pliku `.log` rzeczywiście się zmienia

---

## 📊 Jak to działa?

```
FireSnow → Zapisuje dane → Modyfikuje plik .log
                                    ↓
                            [WATCHDOG wykrywa]
                                    ↓
                            Restart API (3 sek)
                                    ↓
                        API czyta świeże dane z bazy
                                    ↓
                        Endpoint zwraca aktualne dane
```

---

## ✅ Zalety Watchdog

- ✅ **Automatyczny** - nie musisz nic robić
- ✅ **Szybki** - restart zajmuje ~3 sekundy
- ✅ **Niezawodny** - zawsze wykrywa zmiany
- ✅ **Przejrzysty** - widzisz co się dzieje w logach
- ✅ **Bezpieczny** - nie modyfikuje FireSnow ani bazy

---

## 🎉 Gotowe!

Teraz możesz:
1. Uruchomić watchdog: `start-with-watchdog.bat`
2. Pracować normalnie w FireSnow
3. **API automatycznie się odświeży** gdy zmienisz dane
4. Nie musisz się o nic martwić! 🚀

---

**Utworzono:** 2025-10-22  
**Wersja:** 1.0



