# ⚛️ Przykłady użycia w React Frontend

## Jak pobierać dane FireSnow w React (Vite + TypeScript)

---

## 📦 KROK 1: Dodaj typy TypeScript (opcjonalne ale zalecane)

Utwórz plik `src/types/firesnow.ts`:

```typescript
// types/firesnow.ts

export interface Rezerwacja {
  rezerwacja_id: number;
  nazwa_sprzetu: string;
  data_od: string;
  data_do: string;
  cena: number;
  obiekt_id: number;
  klient_id: number;
  imie: string;
  nazwisko: string;
  telefon: string;
}

export interface ZarezerwowaneNarty {
  obiekt_id: number;
  nazwa: string;
  kod: string;
}
```

---

## 🎣 KROK 2: Stwórz custom hook do pobierania danych

Utwórz plik `src/hooks/useFireSnow.ts`:

```typescript
// hooks/useFireSnow.ts
import { useState, useEffect } from 'react';
import type { Rezerwacja, ZarezerwowaneNarty } from '../types/firesnow';

// Hook do pobierania aktywnych rezerwacji
export function useAktywneRezerwacje() {
  const [data, setData] = useState<Rezerwacja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('useFireSnow: Fetching active reservations...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rezerwacje');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`useFireSnow: Received ${result.length} reservations`);
      
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('useFireSnow: Error fetching reservations:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// Hook do pobierania zarezerwowanych nart
export function useZarezerwowaneNarty() {
  const [data, setData] = useState<ZarezerwowaneNarty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('useFireSnow: Fetching reserved skis...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/narty/zarezerwowane');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`useFireSnow: Received ${result.length} reserved skis`);
      
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('useFireSnow: Error fetching reserved skis:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}
```

---

## 🎨 KROK 3: Użyj w komponentach React

### **Przykład 1: Lista rezerwacji z Tailwind + Framer Motion**

```tsx
// components/RezerwacjeList.tsx
import { motion } from 'framer-motion';
import { useAktywneRezerwacje } from '../hooks/useFireSnow';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function RezerwacjeList() {
  const { data: rezerwacje, loading, error, refetch } = useAktywneRezerwacje();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Ładowanie rezerwacji...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Błąd: {error}</p>
        <button 
          onClick={refetch}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Aktywne rezerwacje ({rezerwacje.length})
        </h2>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Odśwież
        </button>
      </div>

      <div className="grid gap-4">
        {rezerwacje.map((rez, index) => (
          <motion.div
            key={rez.rezerwacja_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {rez.nazwa_sprzetu}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rez.imie} {rez.nazwisko}
                </p>
                <p className="text-sm text-gray-500">
                  {rez.telefon}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {rez.cena.toFixed(2)} zł
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ID: {rez.rezerwacja_id}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Od:</span>
                <span className="font-medium">
                  {format(new Date(rez.data_od), 'dd MMM yyyy HH:mm', { locale: pl })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Do:</span>
                <span className="font-medium">
                  {format(new Date(rez.data_do), 'dd MMM yyyy HH:mm', { locale: pl })}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {rezerwacje.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Brak aktywnych rezerwacji
        </div>
      )}
    </div>
  );
}
```

### **Przykład 2: Prosta lista zarezerwowanych nart**

```tsx
// components/ZarezerwowaneNartyList.tsx
import { useZarezerwowaneNarty } from '../hooks/useFireSnow';

export function ZarezerwowaneNartyList() {
  const { data: narty, loading, error } = useZarezerwowaneNarty();

  if (loading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        Zarezerwowane narty ({narty.length})
      </h2>
      
      <ul className="space-y-2">
        {narty.map((narta) => (
          <li 
            key={narta.obiekt_id}
            className="flex justify-between items-center p-3 bg-gray-50 rounded"
          >
            <span className="font-medium">{narta.nazwa}</span>
            <span className="text-sm text-gray-500">{narta.kod}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### **Przykład 3: Dashboard z auto-odświeżaniem**

```tsx
// components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { RezerwacjeList } from './RezerwacjeList';
import { ZarezerwowaneNartyList } from './ZarezerwowaneNartyList';

export function Dashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    // Odświeżaj co 30 sekund
    const interval = setInterval(() => {
      console.log('Dashboard: Auto-refreshing data...');
      window.location.reload(); // Lub użyj refetch() z hooków
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Rezerwacji
          </h1>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              Auto-odświeżanie (30s)
            </span>
          </label>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RezerwacjeList />
          </div>

          <div>
            <ZarezerwowaneNartyList />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 Instalacja dodatkowych pakietów (jeśli potrzebne)

```bash
npm install date-fns
```

---

## 🔥 Gotowe!

Teraz Twoja aplikacja React automatycznie pobiera dane z FireSnow!

**Dane są zawsze aktualne** - gdy ktoś zrobi rezerwację w FireSnow, Twoja aplikacja to zobaczy! ✅

