# Plan Wdrożenia - Refaktoryzacja Frontendu

## Cel
Refaktoryzacja "Boskiego Komponentu" `AnimaComponent.tsx` (ponad 2000 linii) na modułową, łatwą w utrzymaniu strukturę. Zmiana nazwy na `Dashboard` i podział na mniejsze, wyspecjalizowane komponenty.

## Wymagany Przegląd Użytkownika
> [!WAŻNE]
> **Zmiana nazwy**: `AnimaComponent.tsx` zostanie zmieniony na `Dashboard.tsx`.
> **Struktura**: Zostanie utworzony nowy katalog `src/components/dashboard/` dla podkomponentów.

## Proponowane Zmiany

### 1. Struktura Katalogów
Utworzenie `src/components/dashboard/` z następującą strukturą:
- `Dashboard.tsx` (Główny kontener, dawniej AnimaComponent)
- `DashboardLayout.tsx` (Wspólny wrapper układu)
- `TabNavigation.tsx` (Pasek zakładek do przełączania narciarzy)
- `SkierForm.tsx` (Formularz: wzrost, waga, poziom, itp.)
- `SearchMode.tsx` (Kontener domyślnego widoku "Szukaj")
- `EmployeeControls.tsx` (Przycisk modala hasła, przełączniki trybów)

### 2. Definicje Typów (`src/types/dashboard.types.ts`)
#### [NOWY] [dashboard.types.ts](file:///c:/Users/narty/Desktop/asystent_java/src/types/dashboard.types.ts)
- Wydzielenie interfejsów `FormData`, `TabData`, `AppMode` z `AnimaComponent.tsx`.

### 3. Wydzielenie Komponentów

#### [NOWY] [TabNavigation.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/TabNavigation.tsx)
- Przeniesienie logiki renderowania zakładek (górny pasek z imionami narciarzy).
- Props: `tabs`, `activeTabId`, `onTabChange`, `onAddTab`, `onRemoveTab`.

#### [NOWY] [SkierForm.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/SkierForm.tsx)
- Przeniesienie pól formularza (Wzrost, Waga, Poziom, Płeć, Daty).
- Props: `formData`, `onChange`, `errors`.

#### [NOWY] [SearchMode.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/SearchMode.tsx)
- Przeniesienie logiki widoku "Szukaj" (Formularz + Kontener wyników).
- Będzie zawierał `SkierForm` i wyświetlanie wyników (które obecnie jest wplecione w kod).

#### [NOWY] [Dashboard.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/Dashboard.tsx)
- **Zmiana nazwy** `AnimaComponent.tsx` na `Dashboard.tsx`.
- **Refaktoryzacja** w celu użycia nowych podkomponentów.
- Zachowanie zarządzania stanem (zakładki, appMode) tutaj na razie, aby uniknąć psucia logiki, ale delegowanie renderowania do podkomponentów.

### 4. Aktualizacja Punktu Wejścia Aplikacji
#### [MODYFIKACJA] [App.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/App.tsx)
- Importowanie `Dashboard` zamiast `AnimaComponent`.

## Plan Weryfikacji

### Weryfikacja Manualna
1.  **Budowanie**: Uruchom `npm run build`, aby upewnić się, że nie ma błędów TypeScript.
2.  **Sprawdzenie Wizualne**:
    -   Sprawdź, czy zakładki nadal działają (dodawanie/usuwanie/przełączanie).
    -   Sprawdź, czy formularz poprawnie aktualizuje stan.
    -   Sprawdź, czy przełącznik "Tryb Pracownika" działa.
    -   Sprawdź nawigację między trybami (Szukaj -> Przeglądaj -> Rezerwacje).
