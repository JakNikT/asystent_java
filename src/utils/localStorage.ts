/**
 * Narzędzia do zapisywania stanu aplikacji w LocalStorage (appMode, widok rezerwacji, stan wydań/zwrotów)
 */

import type { ViewType } from '../types/viewTypes.js';
import { createLogger } from './logger';

const logger = createLogger('localStorage');

const APP_STATE_KEY = 'ski-assistant-app-state';

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
  reservationsViewType?: ViewType;
  handoutState?: HandoutState; // NOWY: stan widoku "wydaj"
  returnsState?: ReturnsState; // NOWY: stan widoku "zwroty"
  reservationsState?: ReservationsState; // NOWY: stan widoku "rezerwacje"
  lastUpdate: string;
}

/**
 * Zapisuje stan aplikacji (appMode i viewType) do LocalStorage
 * logger.debug(src/utils/localStorage.ts: Zapisuję stan aplikacji)
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
  logger.debug(`src/utils/localStorage.ts: Zapisuję stan aplikacji - appMode: ${appMode}, viewType: ${reservationsViewType || 'brak'}, handoutState: ${handoutState ? 'tak' : 'brak'}, returnsState: ${returnsState ? 'tak' : 'brak'}, reservationsState: ${reservationsState ? 'tak' : 'brak'}`);
  
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
    logger.debug(`src/utils/localStorage.ts: Stan aplikacji zapisany pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas zapisywania stanu aplikacji:`, error);
  }
}

/**
 * Wczytuje stan aplikacji z LocalStorage
 * logger.debug(src/utils/localStorage.ts: Wczytuję stan aplikacji)
 */
export function loadAppState(): AppStateData | null {
  logger.debug(`src/utils/localStorage.ts: Wczytuję stan aplikacji`);
  
  try {
    const storedData = localStorage.getItem(APP_STATE_KEY);
    if (!storedData) {
      logger.debug(`src/utils/localStorage.ts: Brak zapisanego stanu aplikacji`);
      return null;
    }

    const appState = JSON.parse(storedData) as AppStateData;
    logger.debug(`src/utils/localStorage.ts: Stan aplikacji wczytany pomyślnie - appMode: ${appState.appMode}, viewType: ${appState.reservationsViewType || 'brak'}`);
    return appState;
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas wczytywania stanu aplikacji:`, error);
    return null;
  }
}

/**
 * Czyści stan aplikacji z LocalStorage
 * logger.debug(src/utils/localStorage.ts: Czyszczę stan aplikacji)
 */
export function clearAppState(): void {
  logger.debug(`src/utils/localStorage.ts: Czyszczę stan aplikacji`);
  
  try {
    localStorage.removeItem(APP_STATE_KEY);
    logger.debug(`src/utils/localStorage.ts: Stan aplikacji wyczyszczony pomyślnie`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia stanu aplikacji:`, error);
  }
}

/**
 * Czyści zapisany stan widoku "wydaj" (w tym wybranego klienta), zachowując resztę stanu aplikacji
 */
export function clearHandoutState(): void {
  try {
    const state = loadAppState();
    if (!state?.handoutState) return;

    const rest: AppStateData = { ...state };
    delete rest.handoutState;
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(rest));
    logger.debug(`src/utils/localStorage.ts: Stan widoku "wydaj" wyczyszczony`);
  } catch (error) {
    console.error(`src/utils/localStorage.ts: Błąd podczas czyszczenia stanu widoku "wydaj":`, error);
  }
}
