# 🎿 Asystent Doboru Nart - Wersja Web

## 📋 Opis
Nowoczesna aplikacja webowa do inteligentnego doboru sprzętu narciarskiego i snowboardowego. Aplikacja została zmigrowana z języka Python (PyQt5) do **React** z **TypeScript**.

## ✨ Funkcje
- **Inteligentny dobór sprzętu** - zaawansowany algorytm dopasowujący narty, buty i deski snowboardowe na podstawie kryteriów użytkownika (wzrost, waga, poziom, płeć, styl jazdy).
- **Przeglądanie bazy danych** - interaktywna tabela do przeglądania, sortowania i filtrowania całego dostępnego sprzętu.
- **Zarządzanie sprzętem** - możliwość dodawania, edytowania i usuwania pozycji z bazy danych bezpośrednio w aplikacji.
- **System rezerwacji** - integracja z systemem rezerwacji FireSnow, wizualizacja dostępności sprzętu w czasie rzeczywistym.
- **Nowoczesny interfejs** - zaprojektowany w Figma i zaimplementowany przy użyciu Tailwind CSS.
- **Responsywność** - aplikacja dostosowana do urządzeń mobilnych i desktopowych.

## 🚀 Instalacja

### Wymagania
- Node.js (wersja LTS)
- npm (instalowany razem z Node.js)

### Instalacja zależności
```bash
npm install
```

### Uruchomienie
```bash
python main.py
```

## 📁 Struktura projektu
```
APK/
├── main.py                    # Główny plik aplikacji
├── src/                       # Kod źródłowy
│   ├── dane/                  # Moduł danych
│   ├── interfejs/             # Moduł interfejsu
│   ├── logika/                # Moduł logiki
│   ├── narzedzia/             # Moduł narzędzi
│   └── styl/                  # Moduł stylów Figma
├── data/                      # Dane aplikacji
│   ├── csv/                   # Pliki CSV
│   └── logs/                  # Logi
├── resources/                 # Zasoby (ikony, obrazy)
├── docs/                      # Dokumentacja
├── config/                    # Konfiguracja
├── examples/                  # Przykłady i demo
└── tests/                     # Testy
```

## 🎨 Integracja z Figma
Aplikacja wykorzystuje zaawansowany system integracji z Figma:
- Automatyczna konwersja CSS → PyQt5
- Wsparcie dla animacji i efektów
- Responsywne layouty
- 10+ gotowych komponentów

## 📊 Baza danych
- **NOWABAZA_final.csv** - główna baza nart
- **rez.csv** - rezerwacje z FireSnow
- **rez.xlsx** - eksport Excel

## 🔧 Konfiguracja
- `config/figma_config.json` - konfiguracja Figma
- `config/app_config.json` - konfiguracja aplikacji

## 📚 Dokumentacja
- `docs/` - szczegółowa dokumentacja
- `examples/` - przykłady użycia
- `tests/` - testy jednostkowe

## 🛠️ Rozwój
1. Fork projektu
2. Utwórz branch (`git checkout -b feature/nowa-funkcja`)
3. Commit zmian (`git commit -am 'Dodaj nową funkcję'`)
4. Push do branch (`git push origin feature/nowa-funkcja`)
5. Utwórz Pull Request

## 📄 Licencja
Projekt prywatny - WYPAS Ski Rental

## 👥 Autorzy
- **Główny deweloper** - WYPAS Ski Rental
- **Integracja Figma** - AI Assistant

## 🔄 Historia wersji
- **v6.0** - Modularna architektura, integracja Figma
- **v5.x** - Poprzednie wersje (archiwum)

---
*Ostatnia aktualizacja: 24.09.2025*
