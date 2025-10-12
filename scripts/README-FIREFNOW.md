# 🔄 Konwerter plików FireFnow

## Jak przenieść dane z FireFnow do Asystenta Nart?

### Krok 1: Eksport z FireFnow
1. Otwórz aplikację FireFnow
2. Wyeksportuj rezerwacje do pliku CSV
3. Zapisz plik (dowolna nazwa, np. `export.csv`)

### Krok 2: Skopiuj plik
Skopiuj wyeksportowany plik do folderu:
```
public/data/rez.csv
```

⚠️ **WAŻNE**: Nazwa pliku musi być dokładnie `rez.csv`!

### Krok 3: Uruchom konwerter

**Opcja A - Komenda npm (łatwiejsza):**
```bash
npm run convert-firefnow
```

**Opcja B - Node bezpośrednio:**
```bash
node scripts/convert-firefnow-to-rezerwacja.js
```

### Krok 4: Odśwież aplikację
1. Jeśli aplikacja jest uruchomiona, odśwież przeglądarkę (Ctrl+F5)
2. Przejdź do widoku "Rezerwacje"
3. Gotowe! Dane z FireFnow powinny się wyświetlić

---

## Co robi skrypt?

Skrypt automatycznie:
- ✅ Konwertuje kodowanie z Windows-1250 na UTF-8
- ✅ Zamienia średniki (;) na przecinki (,)
- ✅ Naprawia polskie znaki (ą, ć, ę, ł, ń, ó, ś, ź, ż)
- ✅ Zapisuje jako `rezerwacja.csv` (gotowy do użycia)

---

## Troubleshooting

### ❌ "Nie znaleziono pliku"
- Sprawdź czy plik nazywa się dokładnie `rez.csv`
- Sprawdź czy plik jest w folderze `public/data/`
- LUB użyj przycisku "📥 Importuj z FireFnow" w aplikacji

### ❌ "Brak iconv-lite"
Zainstaluj brakującą bibliotekę:
```bash
npm install
```

### ❌ "Zniekształcone polskie znaki"
Skrypt powinien to automatycznie naprawić. Jeśli nie działa:
1. Sprawdź czy plik z FireFnow ma kodowanie Windows-1250
2. Uruchom skrypt ponownie

---

## Automatyzacja (opcjonalnie)

Możesz dodać do package.json:
```json
"scripts": {
  "convert-firefnow": "node scripts/convert-firefnow-to-rezerwacja.js"
}
```

Wtedy wystarczy:
```bash
npm run convert-firefnow
```

