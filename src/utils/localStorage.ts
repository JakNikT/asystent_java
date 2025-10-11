/**
 * Narzędzia do zarządzania LocalStorage dla sesji użytkownika
 * console.log(src/utils/localStorage.ts: Zarządzanie LocalStorage)
 */

export interface UserSessionData {
  formData: {
    dateFrom: {
      day: string;
      month: string;
      year: string;
    };
    dateTo: {
      day: string;
      month: string;
      year: string;
    };
    height: {
      value: string;
      unit: string;
    };
    weight: {
      value: string;
      unit: string;
    };
    level: string;
    gender: string;
    preferences: string[];
  };
  lastSearchDate: string;
}

const STORAGE_KEY = 'ski-assistant-session';
const HISTORY_KEY = 'ski-assistant-history';

/**
 * Zapisuje dane sesji użytkownika do LocalStorage
 * console.log(src/utils/localStorage.ts: Zapisuję dane sesji)
 */
export function saveUserSession(formData: any): void {
  console.log(`src/utils/localStorage.ts: Zapisuję dane sesji użytkownika`);
  
  try {
    const sessionData: UserSessionData = {
      formData: {
        dateFrom: {
          day: formData.dateFrom.day || '',
          month: formData.dateFrom.month || '',
          year: formData.dateFrom.year || ''
        },
        dateTo: {
          day: formData.dateTo.day || '',
          month: formData.dateTo.month || '',
          year: formData.dateTo.year || ''
        },
        height: {
          value: formData.height.value || '',
          unit: formData.height.unit || 'cm'
        },
        weight: {
          value: formData.weight.value || '',
          unit: formData.weight.unit || 'kg'
        },
        level: formData.level || '',
        gender: formData.gender || '',
        preferences: formData.preferences || ['Wszystkie']
      },
      lastSearchDate: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    console.log(`src/utils/localStorage.ts: Dane sesji zapisane pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas zapisywania sesji:`, error);
  }
}

/**
 * Wczytuje dane sesji użytkownika z LocalStorage
 * console.log(src/utils/localStorage.ts: Wczytuję dane sesji)
 */
export function loadUserSession(): UserSessionData | null {
  console.log(`src/utils/localStorage.ts: Wczytuję dane sesji użytkownika`);
  
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      console.log(`src/utils/localStorage.ts: Brak zapisanych danych sesji`);
      return null;
    }

    const sessionData = JSON.parse(storedData) as UserSessionData;
    console.log(`src/utils/localStorage.ts: Dane sesji wczytane pomyślnie`);
    return sessionData;
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas wczytywania sesji:`, error);
    return null;
  }
}

/**
 * Czyści dane sesji użytkownika z LocalStorage
 * console.log(src/utils/localStorage.ts: Czyszczę dane sesji)
 */
export function clearUserSession(): void {
  console.log(`src/utils/localStorage.ts: Czyszczę dane sesji użytkownika`);
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log(`src/utils/localStorage.ts: Dane sesji wyczyszczone pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia sesji:`, error);
  }
}

/**
 * Zapisuje historię wyszukiwania do LocalStorage
 * console.log(src/utils/localStorage.ts: Zapisuję historię wyszukiwania)
 */
export function saveSearchHistory(searchData: any): void {
  console.log(`src/utils/localStorage.ts: Zapisuję historię wyszukiwania`);
  
  try {
    const historyItem = {
      ...searchData,
      timestamp: new Date().toISOString()
    };

    // Wczytaj istniejącą historię
    const existingHistory = loadSearchHistory();
    const updatedHistory = [historyItem, ...existingHistory].slice(0, 10); // Maksymalnie 10 ostatnich wyszukiwań

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    console.log(`src/utils/localStorage.ts: Historia wyszukiwania zapisana pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas zapisywania historii:`, error);
  }
}

/**
 * Wczytuje historię wyszukiwania z LocalStorage
 * console.log(src/utils/localStorage.ts: Wczytuję historię wyszukiwania)
 */
export function loadSearchHistory(): any[] {
  console.log(`src/utils/localStorage.ts: Wczytuję historię wyszukiwania`);
  
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (!storedHistory) {
      console.log(`src/utils/localStorage.ts: Brak zapisanej historii`);
      return [];
    }

    const history = JSON.parse(storedHistory);
    console.log(`src/utils/localStorage.ts: Historia wyszukiwania wczytana pomyślnie`);
    return history;
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas wczytywania historii:`, error);
    return [];
  }
}

/**
 * Czyści historię wyszukiwania z LocalStorage
 * console.log(src/utils/localStorage.ts: Czyszczę historię wyszukiwania)
 */
export function clearSearchHistory(): void {
  console.log(`src/utils/localStorage.ts: Czyszczę historię wyszukiwania`);
  
  try {
    localStorage.removeItem(HISTORY_KEY);
    console.log(`src/utils/localStorage.ts: Historia wyszukiwania wyczyszczona pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia historii:`, error);
  }
}
