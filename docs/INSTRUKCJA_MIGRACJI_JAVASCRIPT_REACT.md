# 🚀 Instalacja i Pierwszy Projekt w JavaScript/React

## 📋 **Migracja Asystenta Doboru Nart z Python do React**

### **Krok 1: Instalacja Podstawowych Narzędzi**

#### **A. Instalacja Node.js i npm**

1. **Pobierz Instalator:** Wejdź na stronę [nodejs.org](https://nodejs.org) i pobierz wersję LTS.
2. **Uruchom Instalację:** Otwórz pobrany plik i postępuj zgodnie z instrukcjami, akceptując domyślne ustawienia. To zainstaluje zarówno Node.js (do uruchamiania kodu) jak i npm (do zarządzania bibliotekami).

#### **B. Weryfikacja Instalacji**
```bash
node --version
npm --version
```

#### **C. Instalacja Dodatków w Cursorze**

1. Otwórz zakładkę **Extensions** (ikona klocków po lewej stronie).
2. Wyszukaj i zainstaluj następujące dodatki:
   - **Prettier - Code formatter:** Do automatycznego formatowania kodu.
   - **ESLint:** Do wykrywania błędów w czasie rzeczywistym.
   - **GitLens:** Do zaawansowanej integracji z Gitem.
   - **Auto Rename Tag:** Do automatycznej zmiany tagów HTML/JSX.
   - **ES7+ React/Redux/React-Native snippets:** Do szybkiego pisania kodu React.

---

## **Krok 2: Tworzenie Projektu React dla Aplikacji Nart**

### **A. Uruchomienie Terminala**

1. W edytorze Cursor, na górnym pasku menu, wybierz **Terminal -> New Terminal**.

### **B. Utworzenie Projektu za Pomocą Vite**

1. W oknie terminala, które pojawiło się na dole, wpisz komendę i wciśnij Enter:
```bash
npm create vite@latest
```

2. Odpowiedz na pytania w terminalu:
   - **Project name:** `asystent-nart-web`
   - **Select a framework:** Wybierz z listy **React**
   - **Select a variant:** Wybierz **TypeScript + SWC**

### **C. Instalacja i Uruchomienie**

1. Wpisz w terminalu poniższe komendy, jedną po drugiej, zatwierdzając każdą Enterem:
```bash
# Wejście do folderu projektu
cd asystent-nart-web

# Instalacja potrzebnych bibliotek
npm install

# Instalacja dodatkowych bibliotek dla aplikacji nart
npm install @types/node
npm install axios
npm install react-router-dom
npm install @types/react-router-dom
npm install tailwindcss
npm install @headlessui/react
npm install @heroicons/react
npm install framer-motion
npm install react-hook-form
npm install @hookform/resolvers
npm install zod

# Uruchomienie aplikacji
npm run dev
```

### **D. Zobacz Efekt**

1. Terminal pokaże Ci adres lokalny (np. `http://localhost:5173`).
2. Otwórz ten adres w przeglądarce internetowej.
3. **Gratulacje!** Właśnie uruchomiłeś swoją pierwszą aplikację w React!

---

## **Krok 3: Architektura Aplikacji Nart**

### **A. Struktura Projektu**
```
asystent-nart-web/
├── public/
│   ├── images/
│   │   ├── narty.png
│   │   └── logo.png
│   └── data/
│       ├── NOWABAZA_final.csv
│       └── rez.csv
├── src/
│   ├── components/
│   │   ├── ui/              # Komponenty UI (przyciski, pola input)
│   │   ├── forms/           # Formularze (dane klienta, preferencje)
│   │   ├── results/         # Komponenty wyników
│   │   └── layout/          # Layout aplikacji
│   ├── hooks/               # Custom hooks
│   ├── services/            # API i logika biznesowa
│   ├── types/               # Definicje TypeScript
│   ├── utils/               # Funkcje pomocnicze
│   ├── styles/              # Style CSS/Tailwind
│   ├── data/                # Dane i parsery CSV
│   └── App.tsx              # Główny komponent
├── package.json
└── vite.config.ts
```

### **B. Mapowanie z Python do React**

| **Python (Obecne)** | **React (Nowe)** |
|---------------------|------------------|
| `src/logika/dobieranie_nart.py` | `src/services/skiMatchingService.ts` |
| `src/dane/wczytywanie_danych.py` | `src/data/csvParser.ts` |
| `src/interfejs/okno_glowne.py` | `src/components/layout/MainLayout.tsx` |
| `src/styl/motyw_kolorow.py` | `src/styles/theme.ts` + Tailwind CSS |
| `data/csv/NOWABAZA_final.csv` | `public/data/NOWABAZA_final.csv` |

---

## **Krok 4: Migracja Logiki Biznesowej**

### **A. Serwis Dobierania Nart**
```typescript
// src/services/skiMatchingService.ts
export interface SkiCriteria {
  height: number;
  weight: number;
  level: number;
  gender: 'M' | 'K';
  style: string;
}

export interface SkiResult {
  id: string;
  name: string;
  brand: string;
  compatibility: number;
  level: string;
  price: number;
}

export class SkiMatchingService {
  async findMatchingSkis(criteria: SkiCriteria): Promise<SkiResult[]> {
    // Logika dobierania nart z Python
    // Przeniesiona do TypeScript
  }
}
```

### **B. Parser Danych CSV**
```typescript
// src/data/csvParser.ts
export interface SkiData {
  id: string;
  name: string;
  brand: string;
  level: string;
  gender: string;
  price: number;
  // ... inne pola
}

export class CsvParser {
  async loadSkisData(): Promise<SkiData[]> {
    // Wczytanie danych z CSV
  }
}
```

---

## **Krok 5: Implementacja Interfejsu React**

### **A. Główny Layout**
```typescript
// src/components/layout/MainLayout.tsx
export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-blue-600">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <SkiForm />
        <ResultsSection />
      </div>
    </div>
  );
};
```

### **B. Formularz Dobierania Nart**
```typescript
// src/components/forms/SkiForm.tsx
export const SkiForm = () => {
  const { register, handleSubmit } = useForm<SkiCriteria>();
  
  const onSubmit = (data: SkiCriteria) => {
    // Logika przetwarzania formularza
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ClientDataSection />
      <PreferencesSection />
      <SubmitButton />
    </form>
  );
};
```

---

## **Krok 6: Integracja z Figma**

### **A. Instalacja Pluginów Figma**
1. Otwórz Figmę
2. Zainstaluj plugin **"Figma to React"**
3. Wyeksportuj komponenty do kodu React

### **B. Konwersja Stylów**
```typescript
// src/styles/figmaStyles.ts
export const figmaStyles = {
  colors: {
    primary: '#386BB2',
    secondary: '#194576',
    accent: '#2C699F',
    light: '#A6C2EF',
    white: '#FFFFFF'
  },
  // ... inne style z Figma
};
```

---

## **Krok 7: Testowanie i Wdrożenie**

### **A. Testy Jednostkowe**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm run test
```

### **B. Build Produkcyjny**
```bash
npm run build
```

### **C. Wdrożenie**
- **Vercel** (zalecane dla React)
- **Netlify**
- **GitHub Pages**

---

## **🎯 Następne Kroki:**

1. **Skonfiguruj środowisko** zgodnie z instrukcją
2. **Utwórz projekt React** z Vite
3. **Zainstaluj dodatkowe biblioteki** dla aplikacji nart
4. **Rozpocznij migrację** logiki biznesowej
5. **Zaimplementuj interfejs** React z integracją Figma

---

## **📚 Przydatne Linki:**

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Figma to React Plugin](https://www.figma.com/community/plugin/747985167520967416/Figma-to-React)

---

**Gotowy do rozpoczęcia migracji! 🚀**
