// src/types/dashboard.types.ts: Typy dla komponentu Dashboard

import type { SearchResults, SearchCriteria } from './ski.types';
import type { FormErrors } from '../utils/formValidation';

/**
 * Stan pól wyszukiwania dla pojedynczego filtra
 */
export interface FilterSearchState {
  searchTerm: string;
  searchFlex: string;
  searchDlugosc: string;
}

/**
 * Typ klucza filtra
 */
export type FilterKey = 'all' | 'TOP' | 'VIP' | 'JUNIOR' | 'BUTY_JUNIOR' | 'DOROSLE' | 'DESKI' | 'BUTY_SNOWBOARD';

/**
 * Dane formularza użytkownika (wzrost, waga, poziom, płeć, daty, rozmiar buta)
 */
export interface FormData {
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
  shoeSize?: string; // rozmiar buta w cm (opcjonalny)
}

/**
 * Dane dla pojedynczej karty (osoby) w systemie zakładek
 */
export interface TabData {
  id: string;
  label: string; // np. "Osoba 1", "Osoba 2"
  formData: FormData;
  selectedStyles: string[];
  searchResults: SearchResults | null;
  currentCriteria: SearchCriteria | null;
  formErrors: FormErrors;
  error: string;
  isLoading: boolean;
  expandedCategories: {
    alternatywy: boolean;
    poziom_za_nisko: boolean;
    inna_plec: boolean;
    na_sile: boolean;
  };
  expandedRows: Record<string, number[]>;
  filterSearchStates: Record<FilterKey, FilterSearchState>; // NOWE: Stan pól wyszukiwania dla każdego filtra
}

/**
 * Tryb aplikacji - określa aktualny widok użytkownika
 */
export type AppMode = 'search' | 'browse' | 'reservations' | 'history';












