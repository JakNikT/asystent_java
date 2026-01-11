/**
 * Narzędzia do zarządzania LocalStorage dla sesji użytkownika
 * console.log(src/utils/localStorage.ts: Zarządzanie LocalStorage)
 */

export interface UserSessionData {
  formData: {
    dateFrom: string;
    dateTo: string;
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
const TABS_STORAGE_KEY = 'ski-assistant-tabs'; // NOWY: dla systemu kart
const APP_STATE_KEY = 'ski-assistant-app-state'; // NOWY: dla stanu aplikacji (appMode, viewType)

/**
 * Zapisuje dane sesji użytkownika do LocalStorage
 * console.log(src/utils/localStorage.ts: Zapisuję dane sesji)
 */
export function saveUserSession(formData: any): void {
  console.log(`src/utils/localStorage.ts: Zapisuję dane sesji użytkownika`);
  
  try {
    const sessionData: UserSessionData = {
      formData: {
        dateFrom: formData.dateFrom || '',
        dateTo: formData.dateTo || '',
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

/**
 * NOWE FUNKCJE DLA SYSTEMU KART (wiele osób)
 */

export interface TabStorageData {
  tabs: any[];
  activeTabId: string;
  lastUpdate: string;
}

/**
 * Zapisuje wszystkie karty do LocalStorage
 */
export function saveAllTabs(tabs: any[], activeTabId: string): void {
  console.log(`src/utils/localStorage.ts: Zapisuję ${tabs.length} kart do LocalStorage`);
  
  try {
    const tabsData: TabStorageData = {
      tabs: tabs.map(tab => ({
        id: tab.id,
        label: tab.label,
        formData: tab.formData,
        selectedStyles: tab.selectedStyles
        // Nie zapisujemy searchResults, currentCriteria - tylko dane formularza
      })),
      activeTabId,
      lastUpdate: new Date().toISOString()
    };

    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabsData));
    console.log(`src/utils/localStorage.ts: Karty zapisane pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas zapisywania kart:`, error);
  }
}

/**
 * Wczytuje wszystkie karty z LocalStorage
 */
export function loadAllTabs(): TabStorageData | null {
  console.log(`src/utils/localStorage.ts: Wczytuję karty z LocalStorage`);
  
  try {
    const storedData = localStorage.getItem(TABS_STORAGE_KEY);
    if (!storedData) {
      console.log(`src/utils/localStorage.ts: Brak zapisanych kart`);
      return null;
    }

    const tabsData = JSON.parse(storedData) as TabStorageData;
    console.log(`src/utils/localStorage.ts: Wczytano ${tabsData.tabs.length} kart`);
    return tabsData;
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas wczytywania kart:`, error);
    return null;
  }
}

/**
 * Czyści zapisane karty z LocalStorage
 */
export function clearAllTabs(): void {
  console.log(`src/utils/localStorage.ts: Czyszczę karty z LocalStorage`);
  
  try {
    localStorage.removeItem(TABS_STORAGE_KEY);
    console.log(`src/utils/localStorage.ts: Karty wyczyszczone pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia kart:`, error);
  }
}

/**
 * NOWE FUNKCJE DLA ZAPISYWANIA STANU APLIKACJI
 */

// Interface dla klienta z rezerwacją (używany w widoku "wydaj")
export interface ClientWithReservation {
  klient: string;
  od: string;
  do: string;
  equipment: Array<{ equipment: string; kod: string; category: string }>;
  totalItems: number;
}

// Interface dla stanu widoku "wydaj"
export interface HandoutState {
  selectedDate: string;
  selectedClient: ClientWithReservation | null;
  checkedItems: string[]; // Set<string> konwertowany na Array dla JSON
}

// Interface dla stanu widoku "zwroty"
export interface ReturnsState {
  returnDate: string;
}

// Interface dla stanu widoku "rezerwacje"
export interface ReservationsState {
  dateFrom: string;
  dateTo: string;
  showPromotorOnly: boolean;
}

export interface AppStateData {
  appMode: 'search' | 'browse' | 'reservations' | 'history';
  reservationsViewType?: 'all' | 'reservations' | 'rentals' | 'past' | 'handout' | 'returns';
  handoutState?: HandoutState; // NOWY: stan widoku "wydaj"
  returnsState?: ReturnsState; // NOWY: stan widoku "zwroty"
  reservationsState?: ReservationsState; // NOWY: stan widoku "rezerwacje"
  lastUpdate: string;
}

/**
 * Zapisuje stan aplikacji (appMode i viewType) do LocalStorage
 * console.log(src/utils/localStorage.ts: Zapisuję stan aplikacji)
 * Zachowuje istniejący reservationsViewType jeśli nie jest podany i appMode === 'reservations'
 * Zachowuje istniejący handoutState jeśli nie jest podany i viewType === 'handout'
 * Zachowuje istniejący returnsState jeśli nie jest podany i viewType === 'returns'
 * Zachowuje istniejący reservationsState jeśli nie jest podany i viewType === 'reservations'
 */
export function saveAppState(
  appMode: string, 
  reservationsViewType?: string,
  handoutState?: HandoutState,
  returnsState?: ReturnsState,
  reservationsState?: ReservationsState
): void {
  console.log(`src/utils/localStorage.ts: Zapisuję stan aplikacji - appMode: ${appMode}, viewType: ${reservationsViewType || 'brak'}, handoutState: ${handoutState ? 'tak' : 'brak'}, returnsState: ${returnsState ? 'tak' : 'brak'}, reservationsState: ${reservationsState ? 'tak' : 'brak'}`);
  
  try {
    // Wczytaj istniejący stan, żeby zachować reservationsViewType jeśli nie jest podany
    const existingState = loadAppState();
    
    const appState: AppStateData = {
      appMode: appMode as AppStateData['appMode'],
      // Zachowaj istniejący viewType jeśli nie jest podany nowy, chyba że wychodzimy z trybu reservations
      reservationsViewType: reservationsViewType !== undefined 
        ? reservationsViewType as AppStateData['reservationsViewType']
        : (appMode === 'reservations' ? existingState?.reservationsViewType : undefined),
      // Zachowaj istniejący handoutState jeśli nie jest podany nowy, chyba że wychodzimy z widoku handout
      handoutState: handoutState !== undefined 
        ? handoutState 
        : (appMode === 'reservations' && (reservationsViewType === 'handout' || existingState?.reservationsViewType === 'handout')
          ? existingState?.handoutState 
          : undefined),
      // Zachowaj istniejący returnsState jeśli nie jest podany nowy, chyba że wychodzimy z widoku returns
      returnsState: returnsState !== undefined 
        ? returnsState 
        : (appMode === 'reservations' && (reservationsViewType === 'returns' || existingState?.reservationsViewType === 'returns')
          ? existingState?.returnsState 
          : undefined),
      // Zachowaj istniejący reservationsState jeśli nie jest podany nowy, chyba że wychodzimy z widoku reservations
      reservationsState: reservationsState !== undefined 
        ? reservationsState 
        : (appMode === 'reservations' && (reservationsViewType === 'reservations' || existingState?.reservationsViewType === 'reservations')
          ? existingState?.reservationsState 
          : undefined),
      lastUpdate: new Date().toISOString()
    };

    localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
    console.log(`src/utils/localStorage.ts: Stan aplikacji zapisany pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas zapisywania stanu aplikacji:`, error);
  }
}

/**
 * Wczytuje stan aplikacji z LocalStorage
 * console.log(src/utils/localStorage.ts: Wczytuję stan aplikacji)
 */
export function loadAppState(): AppStateData | null {
  console.log(`src/utils/localStorage.ts: Wczytuję stan aplikacji`);
  
  try {
    const storedData = localStorage.getItem(APP_STATE_KEY);
    if (!storedData) {
      console.log(`src/utils/localStorage.ts: Brak zapisanego stanu aplikacji`);
      return null;
    }

    const appState = JSON.parse(storedData) as AppStateData;
    console.log(`src/utils/localStorage.ts: Stan aplikacji wczytany pomyślnie - appMode: ${appState.appMode}, viewType: ${appState.reservationsViewType || 'brak'}`);
    return appState;
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas wczytywania stanu aplikacji:`, error);
    return null;
  }
}

/**
 * Czyści stan aplikacji z LocalStorage
 * console.log(src/utils/localStorage.ts: Czyszczę stan aplikacji)
 */
export function clearAppState(): void {
  console.log(`src/utils/localStorage.ts: Czyszczę stan aplikacji`);
  
  try {
    localStorage.removeItem(APP_STATE_KEY);
    console.log(`src/utils/localStorage.ts: Stan aplikacji wyczyszczony pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia stanu aplikacji:`, error);
  }
}
