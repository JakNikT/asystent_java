# 🎿 Asystent Doboru Nart v6.0

## 📋 Opis
Profesjonalna aplikacja do doboru nart narciarskich z integracją Figma i systemem rezerwacji FireSnow.

## ✨ Funkcje
- **Inteligentny dobór nart** - algorytm uwzględniający poziom, wagę, wzrost, płeć
- **Integracja z Figma** - nowoczesny interfejs zgodny z projektem
- **System rezerwacji** - integracja z FireSnow
- **Zaawansowane filtry** - poziom, marka, przeznaczenie
- **Współczynnik idealności** - ocena dopasowania 0-100%

## 🚀 Instalacja

### Wymagania
- Python 3.7+
- PyQt5
- pandas
- requests

### Instalacja zależności
```bash
pip install -r requirements.txt
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
