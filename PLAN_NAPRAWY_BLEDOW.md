# Plan Naprawy Wszystkich Błędów i Podatności
**Projekt:** Asystent Narciarski (`asystent_java`)  
**Dokument powiązany:** [RAPORT_AUDYTU.md](file:///c:/Users/narty/Desktop/asystent_java/RAPORT_AUDYTU.md)  
**Cel:** Kompletne wyeliminowanie luk bezpieczeństwa, błędów logiki biznesowej i długu technologicznego przed wdrożeniem produkcyjnym.  

---

## Spis Treści i Kolejność Realizacji

| Faza | Zakres | Priorytet | Szacowany czas |
| :--- | :--- | :--- | :--- |
| **Faza 1** | Krytyczne Bezpieczeństwo (RODO & Poświadczenia) | 🔴 Najwyższy | ✅ UKOŃCZONE (Commit aafb3b5) |
| **Faza 2** | Poprawność i Stabilność Backend & Mostka Java | 🟠 Wysoki | ✅ UKOŃCZONE (Commit b757589) |
| **Faza 3** | Uwierzytelnianie Personelu i Kontrola Dostępu | 🟠 Wysoki | ✅ UKOŃCZONE |
| **Faza 4** | Testy Algorytmu Doboru Sprzętu i Pokrycie Kodu | 🟡 Średni | ✅ UKOŃCZONE |
| **Faza 5** | Podatności Zależności npm & DevOps | 🟡 Średni | 2 - 3 godziny |

---

## Faza 1: Krytyczne Bezpieczeństwo (RODO & Poświadczenia)

### Zadanie 1.1: Izolacja Wrażliwych Plików CSV z Katalogu Publicznego (Zabezpieczenie RODO)
- **Problem:** Pliki `public/data/rezerwacja.csv`, `public/data/wyp.csv` oraz `public/data/data_base.csv` zawierają nazwiska, telefony i numery umów klientów. Vite kopiuje cały katalog `public/` do `dist/`, a Express serwuje `dist/` jako statyczne pliki HTTP. Pliki CSV są dostępne publicznie bez autoryzacji.
- **Pliki do modyfikacji:**
  - Przeniesienie katalogu: `public/data/` ➡️ `data/` (w katalogu głównym projektu, poza `public/` i poza `dist/`).
  - [src/server/config/env.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/config/env.ts)
  - [.gitignore](file:///c:/Users/narty/Desktop/asystent_java/.gitignore)
- **Kroki implementacji:**
  1. Przenieść fizycznie pliki CSV:
     ```powershell
     # Utworzenie bezpiecznego katalogu danych na poziomie głównym
     mkdir data
     Move-Item -Path public\data\* -Destination data\
     ```
  2. Zaktualizować ścieżki w [src/server/config/env.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/config/env.ts#L58-L60):
     ```typescript
     // PRZED:
     paths: {
         reservationsCsv: path.join(rootDir, 'public', 'data', 'rezerwacja.csv'),
         rentalsCsv: path.join(rootDir, 'public', 'data', 'wyp.csv'),
         skisCsv: path.join(rootDir, 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv')
     }

     // PO:
     paths: {
         reservationsCsv: path.join(rootDir, 'data', 'rezerwacja.csv'),
         rentalsCsv: path.join(rootDir, 'data', 'wyp.csv'),
         skisCsv: path.join(rootDir, 'data', 'NOWA_BAZA_KOMPLETNA.csv')
     }
     ```
  3. Dodać `data/*.csv` z danymi wrażliwymi klientów do [.gitignore](file:///c:/Users/narty/Desktop/asystent_java/.gitignore) (np. `data/rezerwacja.csv`, `data/wyp.csv`), pozostawiając jedynie anonimowe bazy testowe lub szablony kolumn.
  4. Zweryfikować, że po uruchomieniu `npm run build` w katalogu `dist/data/` NIE ma żadnych plików CSV.
- **Weryfikacja:**
  ```bash
  npm run build
  curl -I http://localhost:5001/data/rezerwacja.csv
  # Oczekiwany wynik: 404 Not Found
  ```

---

### Zadanie 1.2: Usunięcie Jawnych Haseł z Repozytorium i Rotacja Poświadczeń
- **Problem:** [db-config.js](file:///c:/Users/narty/Desktop/asystent_java/db-config.js) zawiera hasło `Mypass123!` do bazy MySQL zapisane w kodzie i skomitowane w repozytorium.
- **Pliki do modyfikacji:**
  - [db-config.js](file:///c:/Users/narty/Desktop/asystent_java/db-config.js)
  - [.gitignore](file:///c:/Users/narty/Desktop/asystent_java/.gitignore)
- **Kroki implementacji:**
  1. Usunąć [db-config.js](file:///c:/Users/narty/Desktop/asystent_java/db-config.js) lub zastąpić go `db-config.example.js`:
     ```javascript
     // db-config.example.js
     module.exports = {
       sprzet: {
         host: process.env.DB_HOST || 'localhost',
         user: process.env.DB_USER || 'root',
         password: process.env.DB_PASSWORD || '',
         database: process.env.DB_NAME || 'sprzet_narciarski'
       }
     };
     ```
  2. Dodać `db-config.js` do [.gitignore](file:///c:/Users/narty/Desktop/asystent_java/.gitignore).
  3. Dokonać rotacji hasła użytkownika MySQL w środowisku produkcyjnym/deweloperskim.
  4. Zapisać nowe hasło wyłącznie w pliku `.env` (który jest już ignorowany przez Gita).

---

## Faza 2: Poprawność i Stabilność Backend & Mostka Java

### Zadanie 2.1: Usunięcie Martwego Kodu Dodawania Sprzętu i Potwierdzenie FireSnow Jako Źródła ID
- **Ustalenie domenowe:** Nowy sprzęt wprowadzany jest **wyłącznie w aplikacji FireSnow**. Baza FireSnow nadaje każdej sztuce unikalny klucz główny `obiekt_id`. To z niego maper [equipmentMapper.ts:215-223](file:///c:/Users/narty/Desktop/asystent_java/src/server/utils/equipmentMapper.ts#L215-L223) tworzy kanoniczne ID: `N-{obiekt_id}` dla nart, `B-{obiekt_id}` dla butów, `D-{obiekt_id}` dla desek.
- **Problem martwego kodu:** W projekcie znajdowała się metoda `create` w `equipmentService.ts`, trasa `POST /api/skis` oraz `addSki` w `skiDataService.ts`. Kod ten był zaszłością próbującą generować sztuczne ID w formacie numerycznym bez powiązania z FireSnow i nigdy nie był wywoływany przez frontend (w aplikacji pracownik może sprzęt jedynie przeglądać i edytować parametry dopasowania).
- **Pliki do oczyszczenia:**
  - [src/server/services/equipmentService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/services/equipmentService.ts) — usunięcie metody `create`
  - [src/server/controllers/equipmentController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/equipmentController.ts) — usunięcie handlera `create`
  - [src/server/routes/skis.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/routes/skis.ts) — usunięcie endpointu `POST /`
  - [src/services/skiDataService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiDataService.ts) — usunięcie metody `addSki`
- **Weryfikacja:**
  Uruchomić `npx tsc -b`, `npx tsc -p tsconfig.server.json --noEmit` oraz `npx vitest run` potwierdzając brak odwołań i pełną integralność systemu.

---

### Zadanie 2.2: Wielowątkowość i Ograniczenie Interfejsu w `FireSnowBridge.java`
- **Problem:** [FireSnowBridge/src/FireSnowBridge.java:1317, 1330](file:///c:/Users/narty/Desktop/asystent_java/FireSnowBridge/src/FireSnowBridge.java#L1317-L1330) nasłuchuje na `0.0.0.0` oraz używa `server.setExecutor(null);` (pojedynczy wątek roboczy). Każde wolne zapytanie blokuje całą obsługę API mostka.
- **Pliki do modyfikacji:**
  - [FireSnowBridge/src/FireSnowBridge.java](file:///c:/Users/narty/Desktop/asystent_java/FireSnowBridge/src/FireSnowBridge.java)
- **Proponowana zmiana:**
  ```java
  // Wiersz 1317:
  // Ograniczenie nasłuchiwania do loopback (tylko lokalny serwer Express)
  HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", API_PORT), 0);

  // Wiersz 1330:
  // Zastąpienie null pulą wątków egzekutora
  int poolSize = Math.max(4, Runtime.getRuntime().availableProcessors());
  server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(poolSize));
  server.start();
  ```
- **Kompilacja i weryfikacja:**
  ```powershell
  javac -cp "lib/hsqldb.jar" -d bin src/FireSnowBridge.java
  ```
  Test równoległego wysłania 10 zapytań HTTP do `/api/health` i `/api/rezerwacje/aktywne`.

---

### Zadanie 2.3: Ujednolicenie Obsługi Błędów w Kontrolerach Express
- **Problem:** Kontrolery (`equipmentController.ts`, `reservationController.ts`, etc.) wychwytują błędy w blokach `try...catch` i bezpośrednio wywołują `res.status(500).json(...)`. Omija to centralny middleware [src/server/middleware/errorHandler.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/errorHandler.ts).
- **Pliki do modyfikacji:**
  - [src/server/controllers/equipmentController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/equipmentController.ts)
  - [src/server/controllers/reservationController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/reservationController.ts)
  - [src/server/controllers/fireSnowController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/fireSnowController.ts)
  - [src/server/controllers/rentalController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/rentalController.ts)
  - [src/server/controllers/historyController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/historyController.ts)
- **Proponowana zmiana:**
  Przekazywać przechwycony błąd do `next(error)` zamiast formatować odpowiedź ręcznie:
  ```typescript
  export const equipmentController = {
      async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
          try {
              const data = await equipmentService.getAll();
              res.json(data);
          } catch (error) {
              next(error); // Delegacja do centralnego middleware errorHandler
          }
      }
  };
  ```

---

## Faza 3: Uwierzytelnianie Personelu i Bezpieczeństwo Danych

### Zadanie 3.1: Usunięcie Zahardkodowanego Kodu PIN z Frontendu
- **Problem:** [src/components/dashboard/hooks/useEmployeeAuth.ts:6](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/hooks/useEmployeeAuth.ts#L6) posiada `const EMPLOYEE_PASSWORD = "0000";`.
- **Pliki do modyfikacji:**
  - [src/components/dashboard/hooks/useEmployeeAuth.ts](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/hooks/useEmployeeAuth.ts)
- **Kroki implementacji:**
  Zastąpić weryfikację lokalną asynchronicznym zapytaniem do API backendu:
  ```typescript
  // useEmployeeAuth.ts:
  const login = async (password: string): Promise<boolean> => {
      try {
          const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
          });
          if (response.ok) {
              setIsEmployeeMode(true);
              return true;
          }
          return false;
      } catch (error) {
          logger.error('Błąd logowania pracownika:', error);
          return false;
      }
  };
  ```

---

### Zadanie 3.2: Implementacja Modułu Autoryzacji na Serwerze Express
- **Pliki do utworzenia/modyfikacji:**
  - `src/server/controllers/authController.ts` (nowy)
  - `src/server/routes/authRoutes.ts` (nowy)
  - `src/server/middleware/authMiddleware.ts` (nowy)
  - `src/server/app.ts` (podpięcie tras `/api/auth`)
  - `.env` (dodanie zmiennej `EMPLOYEE_PASSWORD_HASH` lub `EMPLOYEE_PIN`)
- **Architektura rozwiązania:**
  1. Hasło pracownika przechowywane wyłącznie w zmiennej środowiskowej na serwerze (`.env`).
  2. Endpoint `POST /api/auth/login` weryfikuje poprawność hasła i ustawia ciasteczko sesyjne `HttpOnly, SameSite=Strict` z podpisem kryptograficznym lub tokenem HMAC.
  3. Endpoint `POST /api/auth/logout` czyści sesję.
  4. Endpoint `GET /api/auth/status` weryfikuje, czy bieżąca sesja użytkownika posiada uprawnienia personelu.
  5. Middleware `requireEmployeeAuth` zabezpiecza operacje:
     - `POST /api/equipment` (dodawanie nart)
     - `PUT /api/equipment/:id` (edycja parametrów nart)
     - `DELETE /api/equipment/:id`
     - Szczegółowe dane osobowe klientów w `/api/reservations`

---

## Faza 4: Jakość Kodu, Testy i Algorytm Doboru

### Zadanie 4.1: Konfiguracja Raportowania Pokrycia Kodu (Vitest Coverage)
- **Problem:** `npm run test:coverage` zawiesza się błędem braku `@vitest/coverage-v8`.
- **Kroki implementacji:**
  1. Instalacja zależności:
     ```bash
     npm install -D @vitest/coverage-v8
     ```
  2. Uruchomienie i weryfikacja:
     ```bash
     npm run test:coverage
     ```

---

### Zadanie 4.2: Zestaw Testów Jednostkowych dla `skiMatchingServiceV2.ts`
- **Problem:** 1,967 linii algorytmu doboru sprzętu w [src/services/skiMatchingServiceV2.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiMatchingServiceV2.ts) nie posiada ani jednego testu automatycznego.
- **Pliki do utworzenia:**
  - `src/test/skiMatchingService.test.ts` (nowy)
- **Scenariusze testowe do pokrycia:**
  1. **Podstawowy dobór nart wg wzrostu i wagi:**
     - Narciarz: wzrost 175cm, waga 75kg, poziom średniozaawansowany (3).
     - Weryfikacja, czy zwracane narty mieszczą się w przedziale wagowym i optymalnej długości (np. 165-170cm dla SLG).
  2. **Wagi kryteriów:**
     - Potwierdzenie, że poziom umiejętności stanowi 40% wagi oceny, waga 25%, wzrost 20%.
  3. **Tolerancje (system 3-kolorowy):**
     - Różnica 1 poziomu umiejętności ➡️ oznaczenie żółte (dopuszczalne z ostrzeżeniem).
     - Różnica powyżej 2 poziomów ➡️ odrzucenie lub kategoria "poziom za nisko/za wysoko".
  4. **Filtry płci i przeznaczenia:**
     - Kobieta szukająca nart damskich vs uniseks.
  5. **Dobór butów i desek snowboardowych:**
     - Weryfikacja poprawności filtrowania wg rozmiaru buta (w cm z połówkami np. 27.5).

---

## Faza 5: Podatności Zależności npm & DevOps

### Zadanie 5.1: Rozwiązanie Podatności z `npm audit`
- **Stan wyjściowy:** 40 podatności (4 krytyczne, 26 wysokich, 8 umiarkowanych, 2 niskie).
- **Kroki implementacji:**
  1. Wykonanie automatycznej aktualizacji bezpiecznych pakietów:
     ```bash
     npm audit fix
     ```
  2. Dla podatności wymagających breaking changes (`npm audit fix --force`) przeprowadzić ręczną weryfikację kompatybilności wersji Vite, Express i modułów pomocniczych.
  3. Uruchomić pełny zestaw kontrolny: `npm run build` oraz `npm test`.

---

### Zadanie 5.2: Weryfikacja Kontenera Docker i Skryptów Startowych
- **Pliki do weryfikacji:**
  - [Dockerfile](file:///c:/Users/narty/Desktop/asystent_java/Dockerfile)
  - [docker-compose.yml](file:///c:/Users/narty/Desktop/asystent_java/docker-compose.yml)
  - [start_jedno_okno.bat](file:///c:/Users/narty/Desktop/asystent_java/start_jedno_okno.bat)
- **Kroki implementacji:**
  1. Upewnić się, że w obrazie Docker środowisko uruchomieniowe nie kopiuje wrażliwych plików `.env` ani produkcyjnych baz danych `*.csv`.
  2. Sprawdzić poprawność skryptu `start_jedno_okno.bat`, aby proces FireSnowBridge i serwera Node uruchamiały się bezkonfliktowo.

---

## Lista Kontrolna Wdrożenia (Definition of Done)

Przed uznaniem aplikacji za gotową do produkcji, każdy z poniższych punktów musi zostać zweryfikowany:

- [x] Pliki z danymi klientów usunięte z `public/`, baza sprzętu w `data/` — brak możliwości pobrania `rezerwacja.csv` przez URL serwera (`dist/data` nie istnieje). ✅
- [x] Hasło do bazy danych usunięte z plików śledzonych przez Gita (`db-config.example.js` + `.gitignore`). ✅
- [x] Kod PIN `"0000"` usunięty z kodu frontendu — autoryzacja odbywa się przez backend (HMAC tokeny, `authController`, `requireEmployeeAuth`). ✅
- [x] Źródło ID sprzętu potwierdzone w FireSnow (`obiekt_id`), martwy kod generatora/dodawania usunięty. ✅
- [x] `FireSnowBridge.java` posiada pulę wątków (`newFixedThreadPool`) i nasłuchuje na `127.0.0.1`. ✅
- [x] Kontrolery Express przekazują błędy do `next(error)` i centralnego middleware. ✅
- [x] Pakiet `@vitest/coverage-v8` zainstalowany — polecenie `npm run test:coverage` działa poprawnie (raportuje pokrycie). ✅
- [x] Napisano zestaw testów dla `skiMatchingServiceV2.ts` oraz `authUtils.ts` (66 testów w 5 plikach testowych). ✅
- [x] `npx eslint .` przechodzi z wynikiem 0 błędów. ✅
- [x] `npm run build` (`tsc -b && vite build`) kończy się sukcesem. ✅
- [x] `npm run build:server` (`tsc -p tsconfig.server.json`) kończy się sukcesem. ✅
- [x] `npx vitest run` kończy się zaliczeniem wszystkich testów (66 passed). ✅
