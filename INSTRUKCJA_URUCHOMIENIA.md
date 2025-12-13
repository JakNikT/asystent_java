# 🚀 Jak Uruchomić Aplikację Po Zmianach

## ⚠️ WAŻNE - Wymagane Działania

### 1. Utwórz plik konfiguracyjny `.env`

Skopiuj wzorcowy plik konfiguracji:

```bash
cp env.example .env
```

### 2. Uzupełnij hasło do bazy danych

Otwórz plik `.env` i uzupełnij hasło:

```env
DB_PASSWORD=twoje_haslo_do_mysql
```

**Uwaga**: Bez tego kroku aplikacja NIE uruchomi się i wyświetli błąd:
```
❌ Błąd konfiguracji: Brakujące wymagane zmienne środowiskowe:
   - DB_PASSWORD
💡 Wskazówka: Skopiuj plik env.example do .env i uzupełnij wartości.
```

### 3. Uruchom aplikację

Normalnie, jak dotychczas:

```bash
# Development - frontend
npm run dev

# Backend server
npm run server

# Lub wszystko naraz
npm run dev:all
```

---

## 📋 Co Się Zmieniło?

### ✅ Bezpieczeństwo
- Hasło do bazy danych **nie jest już w kodzie**
- Trzeba je ustawić w pliku `.env` (który jest w `.gitignore`)
- Aplikacja wymusza ustawienie hasła

### ✅ Logowanie
- Dodano profesjonalny system logowania dla frontendu
- 2 pliki serwisowe używają nowego loggera (zamiast console.log)
- Pozostałe pliki będą aktualizowane stopniowo

### ❌ Co NIE uległo zmianie?
- Logika biznesowa - **wszystko działa tak samo**
- Interfejs użytkownika - **bez zmian**
- Funkcjonalności - **bez zmian**

---

## 🔧 Opcjonalna Konfiguracja

W pliku `.env` możesz dodać dodatkowe ustawienia:

```env
# Port serwera backend (domyślnie 5001)
PORT=5001

# URL FireSnow API (domyślnie http://localhost:8081)
FIRESNOW_API_URL=http://localhost:8081

# Czy używać FireSnow API (domyślnie true)
USE_FIRESNOW_API=true

# Poziom logowania backendu (domyślnie info)
LOG_LEVEL=info

# Folder logów (domyślnie logs)
LOG_DIR=logs

# Frontend: Poziom logowania (debug | info | warn | error)
VITE_LOG_LEVEL=info

# Frontend: Czy logować w produkcji (true | false)
VITE_ENABLE_LOGS=false

# Baza danych MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=TWOJE_HASLO_TUTAJ
DB_NAME=sprzet_narciarski
DB_HISTORY_NAME=history
```

---

## ❓ Problemy?

### Aplikacja nie startuje
```
❌ Błąd konfiguracji: Brakujące wymagane zmienne środowiskowe:
   - DB_PASSWORD
```

**Rozwiązanie**: Utworzyć plik `.env` i uzupełnić hasło (patrz krok 1-2).

### Nie mogę połączyć się z bazą danych
**Rozwiązanie**: Sprawdź czy hasło w `.env` jest poprawne.

### Logi nie wyświetlają się
**Rozwiązanie**: To normalne - w produkcji logi są domyślnie wyłączone (oprócz błędów). W development wszystko działa normalnie.

---

## 📚 Więcej Informacji

- **Pełny przegląd**: `REVIEW_APLIKACJI.md`
- **Szczegóły poprawek**: `PODSUMOWANIE_POPRAWEK.md`
- **Wzorcowa konfiguracja**: `env.example`

---

**Pytania? Problemy?** Sprawdź logi w folderze `logs/` lub skontaktuj się z developerem.

