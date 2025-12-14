/**
 * src/components/dashboard/useDashboardState.ts: Hook zarządzający stanem Dashboard
 * Zawiera całą logikę stanu, walidacji, wyszukiwania i zarządzania kartami
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CSVParser } from '../../utils/csvParser';
import { SkiDataService } from '../../services/skiDataService';
import { SkiMatchingServiceV2 } from '../../services/skiMatchingServiceV2';
import { 
  validateForm, 
  initialFormErrors, 
  validateDay, 
  validateMonth, 
  validateYear, 
  validateHeightRealtime, 
  validateWeightRealtime, 
  validateLevelRealtime, 
  validateGenderRealtime,
  validateShoeSizeRealtime,
  type FormErrors 
} from '../../utils/formValidation';
import { saveSearchHistory, saveAllTabs, loadAllTabs } from '../../utils/localStorage';
import type { SkiData, SearchResults, SearchCriteria, SkiMatch } from '../../types/ski.types';
import type { FormData, TabData, AppMode, FilterKey } from '../../types/dashboard.types';
import { createLogger } from '../../utils/logger';

// src/components/dashboard/useDashboardState.ts: Logger dla useDashboardState
const logger = createLogger('useDashboardState');

// Hasło pracownika
const EMPLOYEE_PASSWORD = "0000";

export interface DashboardStateReturn {
  // Stany
  tabs: TabData[];
  activeTabId: string;
  activeTab: TabData;
  appMode: AppMode;
  hasSelectedGroup: boolean;
  equipmentTypeFilter: string;
  categoryFilter: string;
  isPasswordModalOpen: boolean;
  passwordError: string;
  isEmployeeMode: boolean;
  skisDatabase: SkiData[];
  suggestions: string[];
  
  // Skróty do danych aktywnej karty
  formData: FormData;
  selectedStyles: string[];
  searchResults: SearchResults | null;
  currentCriteria: SearchCriteria | null;
  formErrors: FormErrors;
  error: string;
  isLoading: boolean;
  expandedCategories: TabData['expandedCategories'];
  expandedRows: TabData['expandedRows'];
  
  // Funkcje zarządzania kartami
  updateActiveTab: (updates: Partial<TabData>) => void;
  addNewTab: () => void;
  removeTab: (tabId: string) => void;
  setActiveTabId: (id: string) => void;
  
  // Funkcje formularza
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
  setSelectedStyles: (styles: string[] | ((prev: string[]) => string[])) => void;
  setFormErrors: (errors: FormErrors | ((prev: FormErrors) => FormErrors)) => void;
  setError: (err: string) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentCriteria: (criteria: SearchCriteria | null) => void;
  setExpandedCategories: (categories: TabData['expandedCategories'] | ((prev: TabData['expandedCategories']) => TabData['expandedCategories'])) => void;
  setExpandedRows: (rows: Record<string, number[]> | ((prev: Record<string, number[]>) => Record<string, number[]>)) => void;
  
  // Funkcje wyszukiwania
  handleInputChange: (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => void;
  handleSubmit: (customFormData?: FormData) => void;
  handleSubmitWithStyles: (styles: string[]) => void;
  handleStyleToggle: (style: string) => void;
  handleClear: () => void;
  
  // Funkcje trybów aplikacji
  setAppMode: (mode: AppMode) => void;
  setHasSelectedGroup: (hasGroup: boolean) => void;
  handleBrowseMode: (hasGroup?: boolean) => void;
  handleBackToSearch: () => void;
  handleShowAllEquipment: () => void;
  handleQuickFilterInSearch: (type: string, category: string) => void;
  
  // Funkcje filtrów
  setEquipmentTypeFilter: (filter: string) => void;
  setCategoryFilter: (filter: string) => void;
  filterSearchResults: (results: SearchResults | null) => SearchResults | null;
  groupMatchesByModel: (matches: SkiMatch[]) => SkiMatch[];
  
  // Funkcje pracownika
  handlePasswordSubmit: (password: string) => void;
  handleToggleEmployeeMode: () => void;
  setIsPasswordModalOpen: (open: boolean) => void;
  setPasswordError: (error: string) => void;
  
  // Funkcje pomocnicze
  parseDate: (dateObj: { day: string; month: string; year: string }) => Date | undefined;
  handleDateFieldClick: (e: React.MouseEvent<HTMLInputElement>) => void;
  handleDateChange: (section: 'dateFrom' | 'dateTo', field: 'day' | 'month' | 'year', value: string, inputRef?: HTMLInputElement) => void;
  handleBrowseCriteriaChange: (criteria: Partial<SearchCriteria>) => void;
  handleFilterSearchChange: (filterKey: FilterKey, field: 'searchTerm' | 'searchFlex' | 'searchDlugosc', value: string) => void;
  
  // Funkcje kategorii i kart
  toggleCategory: (category: 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile') => void;
  isCardExpandedInRow: (category: string, cardIndex: number) => boolean;
  toggleCardInRow: (category: string) => void;
  
  // Funkcje bazy danych
  loadDatabase: () => Promise<void>;
  
  // Computed values
  computedInitialFilter: string;
  filteredSearchResults: SearchResults | null;
  groupedResults: SearchResults | null;
  
  // Refs
  dayFromRef: React.RefObject<HTMLInputElement | null>;
  monthFromRef: React.RefObject<HTMLInputElement | null>;
  dayToRef: React.RefObject<HTMLInputElement | null>;
  monthToRef: React.RefObject<HTMLInputElement | null>;
  heightRef: React.RefObject<HTMLInputElement | null>;
  weightRef: React.RefObject<HTMLInputElement | null>;
  levelRef: React.RefObject<HTMLInputElement | null>;
  genderRef: React.RefObject<HTMLInputElement | null>;
  shoeSizeRef: React.RefObject<HTMLInputElement | null>;
}

export const useDashboardState = (): DashboardStateReturn => {
  // Stany
  const [tabs, setTabs] = useState<TabData[]>([
    {
      id: '1',
      label: 'Osoba 1',
      formData: {
        dateFrom: { day: '', month: '', year: '' },
        dateTo: { day: '', month: '', year: '' },
        height: { value: '', unit: 'cm' },
        weight: { value: '', unit: 'kg' },
        level: '',
        gender: '',
        shoeSize: ''
      },
      selectedStyles: [],
      searchResults: null,
      currentCriteria: null,
      formErrors: initialFormErrors,
      error: '',
      isLoading: false,
      expandedCategories: {
        alternatywy: false,
        poziom_za_nisko: false,
        inna_plec: false,
        na_sile: false,
      },
      expandedRows: {
        idealne: [],
        alternatywy: [],
        poziom_za_nisko: [],
        inna_plec: [],
        na_sile: []
      },
      filterSearchStates: {
        all: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        TOP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        VIP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        BUTY_JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        DOROSLE: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        DESKI: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        BUTY_SNOWBOARD: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
      }
    }
  ]);
  
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [skisDatabase, setSkisDatabase] = useState<SkiData[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [appMode, setAppMode] = useState<AppMode>('search');
  const [hasSelectedGroup, setHasSelectedGroup] = useState<boolean>(false);
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [isEmployeeMode, setIsEmployeeMode] = useState<boolean>(false);

  // Helper: Pobierz aktywną kartę
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  
  // Helper: Aktualizuj aktywną kartę
  const updateActiveTab = (updates: Partial<TabData>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  // Skróty do danych aktywnej karty
  const formData = activeTab.formData;
  const setFormData = (data: FormData | ((prev: FormData) => FormData)) => {
    const newData = typeof data === 'function' ? data(activeTab.formData) : data;
    updateActiveTab({ formData: newData });
  };
  
  const selectedStyles = activeTab.selectedStyles;
  const setSelectedStyles = (styles: string[] | ((prev: string[]) => string[])) => {
    const newStyles = typeof styles === 'function' ? styles(activeTab.selectedStyles) : styles;
    updateActiveTab({ selectedStyles: newStyles });
  };
  
  const searchResults = activeTab.searchResults;
  const setSearchResults = (results: SearchResults | null) => {
    updateActiveTab({ searchResults: results });
  };
  
  const formErrors = activeTab.formErrors;
  const setFormErrors = (errors: FormErrors | ((prev: FormErrors) => FormErrors)) => {
    const newErrors = typeof errors === 'function' ? errors(activeTab.formErrors) : errors;
    updateActiveTab({ formErrors: newErrors });
  };
  
  const error = activeTab.error;
  const setError = (err: string) => {
    updateActiveTab({ error: err });
  };
  
  const isLoading = activeTab.isLoading;
  const setIsLoading = (loading: boolean) => {
    updateActiveTab({ isLoading: loading });
  };
  
  const currentCriteria = activeTab.currentCriteria;
  const setCurrentCriteria = (criteria: SearchCriteria | null) => {
    updateActiveTab({ currentCriteria: criteria });
  };

  const expandedCategories = activeTab.expandedCategories;
  const setExpandedCategories = (categories: typeof activeTab.expandedCategories | ((prev: typeof activeTab.expandedCategories) => typeof activeTab.expandedCategories)) => {
    const newCategories = typeof categories === 'function' ? categories(activeTab.expandedCategories) : categories;
    updateActiveTab({ expandedCategories: newCategories });
  };
  
  const expandedRows = activeTab.expandedRows;
  const setExpandedRows = (rows: Record<string, number[]> | ((prev: Record<string, number[]>) => Record<string, number[]>)) => {
    const newRows = typeof rows === 'function' ? rows(activeTab.expandedRows) : rows;
    updateActiveTab({ expandedRows: newRows });
  };

  // Refs dla automatycznego przechodzenia między polami
  const dayFromRef = React.useRef<HTMLInputElement | null>(null);
  const monthFromRef = React.useRef<HTMLInputElement | null>(null);
  const dayToRef = React.useRef<HTMLInputElement | null>(null);
  const monthToRef = React.useRef<HTMLInputElement | null>(null);
  const heightRef = React.useRef<HTMLInputElement | null>(null);
  const weightRef = React.useRef<HTMLInputElement | null>(null);
  const levelRef = React.useRef<HTMLInputElement | null>(null);
  const genderRef = React.useRef<HTMLInputElement | null>(null);
  const shoeSizeRef = React.useRef<HTMLInputElement | null>(null);

  // Funkcje zarządzania kartami
  const addNewTab = () => {
    const newId = (tabs.length + 1).toString();
    const newTab: TabData = {
      id: newId,
      label: `Osoba ${newId}`,
      formData: {
        dateFrom: { day: '', month: '', year: '' },
        dateTo: { day: '', month: '', year: '' },
        height: { value: '', unit: 'cm' },
        weight: { value: '', unit: 'kg' },
        level: '',
        gender: '',
        shoeSize: ''
      },
      selectedStyles: [],
      searchResults: null,
      currentCriteria: null,
      formErrors: initialFormErrors,
      error: '',
      isLoading: false,
      expandedCategories: {
        alternatywy: false,
        poziom_za_nisko: false,
        inna_plec: false,
        na_sile: false,
      },
      expandedRows: {
        idealne: [],
        alternatywy: [],
        poziom_za_nisko: [],
        inna_plec: [],
        na_sile: []
      },
      filterSearchStates: {
        all: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        TOP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        VIP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        BUTY_JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        DOROSLE: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        DESKI: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        BUTY_SNOWBOARD: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
      }
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const removeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Funkcja do przełączania rozwinięcia kategorii
  const toggleCategory = (category: 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile') => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Funkcja do sprawdzania czy karta jest rozwinięta w rzędzie
  const isCardExpandedInRow = (category: string, cardIndex: number): boolean => {
    return expandedRows[category]?.includes(cardIndex) || false;
  };

  // Funkcja do przełączania konkretnej karty w rzędzie
  const toggleCardInRow = (category: string) => {
    setExpandedRows(prev => {
      const currentExpanded = prev[category] || [];
      
      if (currentExpanded.length > 0) {
        return {
          ...prev,
          [category]: []
        };
      } else {
        const cardsToExpand = [];
        const totalCards = searchResults?.[category as keyof SearchResults]?.length || 0;
        for (let i = 0; i < totalCards; i++) {
          cardsToExpand.push(i);
        }
        
        return {
          ...prev,
          [category]: cardsToExpand
        };
      }
    });
  };

  // Funkcja grupowania wyników po modelu
  const groupMatchesByModel = (matches: SkiMatch[]): SkiMatch[] => {
    const grouped = new Map<string, SkiMatch[]>();
    
    matches.forEach(match => {
      const key = `${match.ski.MARKA}|${match.ski.MODEL}|${match.ski.DLUGOSC}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(match);
    });
    
    return Array.from(grouped.values()).map(group => group[0]);
  };

  // Funkcja filtrowania wyników wyszukiwania
  const filterSearchResults = (results: SearchResults | null): SearchResults | null => {
    if (!results) return null;
    if (!equipmentTypeFilter && !categoryFilter) return results;
    
    logger.info('src/components/dashboard/useDashboardState.ts: Filtrowanie wyników - typ:', equipmentTypeFilter, 'kategoria:', categoryFilter);
    
    const filterMatches = (matches: SkiMatch[]) => {
      return matches.filter(match => {
        let typeMatch = true;
        let catMatch = true;
        
        if (equipmentTypeFilter) {
          typeMatch = match.ski.TYP_SPRZETU === equipmentTypeFilter;
        }
        
        if (categoryFilter) {
          if (categoryFilter === 'TOP_VIP') {
            catMatch = match.ski.KATEGORIA === 'TOP' || match.ski.KATEGORIA === 'VIP';
          } else {
            catMatch = match.ski.KATEGORIA === categoryFilter;
          }
        }
        
        return typeMatch && catMatch;
      });
    };
    
    const filtered = {
      idealne: filterMatches(results.idealne),
      alternatywy: filterMatches(results.alternatywy),
      poziom_za_nisko: filterMatches(results.poziom_za_nisko),
      inna_plec: filterMatches(results.inna_plec),
      na_sile: filterMatches(results.na_sile),
      wszystkie: filterMatches(results.wszystkie)
    };
    
    logger.info('src/components/dashboard/useDashboardState.ts: Wyniki po filtrowaniu:', {
      idealne: filtered.idealne.length,
      alternatywy: filtered.alternatywy.length,
      wszystkie: filtered.wszystkie.length
    });
    
    return filtered;
  };

  // Funkcja automatycznego wyboru pierwszej dostępnej kategorii
  const autoSelectFirstCategory = (results: SearchResults) => {
    logger.info('src/components/dashboard/useDashboardState.ts: Automatyczny wybór pierwszej kategorii z wynikami');
    
    const categories = [
      { type: 'NARTY', category: 'TOP_VIP', label: 'Narty (TOP+VIP)' },
      { type: 'NARTY', category: 'JUNIOR', label: 'Narty Junior' },
      { type: 'BUTY', category: 'JUNIOR', label: 'Buty Junior' },
      { type: 'BUTY', category: 'DOROSLE', label: 'Buty dorosłe' },
      { type: 'DESKI', category: '', label: 'Deski' },
      { type: 'BUTY_SNOWBOARD', category: '', label: 'Buty Snowboard' }
    ];
    
    for (const cat of categories) {
      const filtered = results.wszystkie.filter(m => {
        const typeMatch = m.ski.TYP_SPRZETU === cat.type;
        
        let catMatch = true;
        if (cat.category) {
          if (cat.category === 'TOP_VIP') {
            catMatch = m.ski.KATEGORIA === 'TOP' || m.ski.KATEGORIA === 'VIP';
          } else {
            catMatch = m.ski.KATEGORIA === cat.category;
          }
        }
        
        return typeMatch && catMatch;
      });
      
      if (filtered.length > 0) {
        logger.info(`Wybrano kategorię ${cat.label} (${filtered.length} wyników)`);
        setEquipmentTypeFilter(cat.type);
        setCategoryFilter(cat.category);
        return;
      }
    }
    
    logger.info('src/components/dashboard/useDashboardState.ts: Nie znaleziono żadnej kategorii z wynikami');
  };

  // Funkcja do parsowania daty
  const parseDate = (dateObj: { day: string; month: string; year: string }): Date | undefined => {
    if (!dateObj.day || !dateObj.month || !dateObj.year) {
      return undefined;
    }
    
    const day = parseInt(dateObj.day);
    const month = parseInt(dateObj.month);
    let year = parseInt(dateObj.year);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return undefined;
    }
    
    if (year >= 24 && year <= 30) {
      year = 2000 + year;
    } else if (year < 24 || year > 2030) {
      return undefined;
    }
    
    return new Date(year, month - 1, day);
  };

  // Funkcja pomocnicza do focusowania i zaznaczania tekstu
  const focusAndSelectIfValue = (input: HTMLInputElement | null) => {
    if (input) {
      input.focus();
      setTimeout(() => {
        if (input.value) {
          input.select();
        }
      }, 0);
    }
  };

  // Funkcja obsługi zmian kryteriów z BrowseSkisComponent
  const handleBrowseCriteriaChange = (criteria: Partial<SearchCriteria>) => {
    logger.info('Otrzymano zmienione kryteria z BrowseSkisComponent:', criteria);
    
    setFormData(prev => ({
      ...prev,
      height: {
        ...prev.height,
        value: criteria.wzrost?.toString() || prev.height.value
      },
      weight: {
        ...prev.weight,
        value: criteria.waga?.toString() || prev.weight.value
      },
      level: criteria.poziom?.toString() || prev.level,
      gender: criteria.plec?.toUpperCase() || prev.gender
    }));
    
    logger.info('Zaktualizowano formData z kryteriów BrowseSkisComponent');
  };

  // Funkcja obsługi zmian daty z BrowseSkisComponent
  const handleDateChange = (
    section: 'dateFrom' | 'dateTo',
    field: 'day' | 'month' | 'year',
    value: string,
    inputRef?: HTMLInputElement
  ) => {
    logger.info(`Zmiana daty z BrowseSkisComponent - sekcja: ${section}, pole: ${field}, wartość: "${value}"`);
    handleInputChange(section, field, value, inputRef);
  };

  // Funkcja obsługi zmian w polach formularza
  const handleInputChange = (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => {
    logger.debug(`Zmiana pola - sekcja: ${section}, pole: ${field}, wartość: "${value}"`);
    
    // Walidacja w czasie rzeczywistym
    let isValid = true;
    let errorMessage = '';

    if (section === 'dateFrom' || section === 'dateTo') {
      if (field === 'day') {
        const validation = validateDay(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      } else if (field === 'month') {
        const validation = validateMonth(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      } else if (field === 'year') {
        const validation = validateYear(value);
        isValid = validation.isValid;
        errorMessage = validation.message;
      }
    } else if (section === 'height' && field === 'value') {
      const validation = validateHeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'weight' && field === 'value') {
      const validation = validateWeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'level') {
      const validation = validateLevelRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'gender') {
      const validation = validateGenderRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (section === 'shoeSize') {
      const validation = validateShoeSizeRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    }

    if (!isValid) {
      logger.debug(`Walidacja nie przeszła - ${errorMessage}`);
      return;
    }

    // Aktualizuj dane formularza
    if (section === 'dateFrom' || section === 'dateTo') {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else if (section === 'height' || section === 'weight') {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: value
      }));
    }

    // Wyczyść błędy dla tego pola
    setFormErrors(prev => {
      const newErrors = { ...prev };
      if (section === 'dateFrom' || section === 'dateTo') {
        newErrors[section] = { ...newErrors[section], [field]: '' };
      } else if (section === 'height' || section === 'weight' || section === 'level' || section === 'gender' || section === 'shoeSize') {
        newErrors[section] = '';
      }
      return newErrors;
    });

    // Automatyczne przechodzenie do następnego pola
    if (inputRef) {
      if (section === 'dateFrom' && field === 'day' && value.length === 2) {
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      } else if (section === 'dateFrom' && field === 'month' && value.length === 2) {
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="YY"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      } else if (section === 'dateFrom' && field === 'year' && value.length === 2) {
        focusAndSelectIfValue(dayToRef.current);
      } else if (section === 'dateTo' && field === 'day' && value.length === 2) {
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      } else if (section === 'dateTo' && field === 'month' && value.length === 2) {
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="YY"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      } else if (section === 'dateTo' && field === 'year' && value.length === 2) {
        focusAndSelectIfValue(heightRef.current);
      } else if (section === 'height' && field === 'value') {
        const heightNum = parseInt(value);
        if (value.length >= 3 || (value.length >= 2 && heightNum >= 100)) {
          focusAndSelectIfValue(weightRef.current);
        }
      } else if (section === 'weight' && field === 'value') {
        if (value.length === 2 && !value.startsWith('1') && !value.startsWith('2')) {
          focusAndSelectIfValue(levelRef.current);
        } else if (value.length === 3 && (value.startsWith('1') || value.startsWith('2'))) {
          focusAndSelectIfValue(levelRef.current);
        }
      } else if (section === 'level' && value.length >= 1) {
        focusAndSelectIfValue(genderRef.current);
      }
    }
  };

  // Funkcja obsługi zmiany stylu
  const handleStyleToggle = (style: string) => {
    const newStyles = selectedStyles.includes(style) ? [] : [style];
    
    logger.info(`Wybrano styl ${style}, nowe style:`, newStyles);
    setSelectedStyles(newStyles);
    
    if (searchResults) {
      setTimeout(() => {
        logger.info(`Automatyczne wyszukiwanie po przełączeniu filtra`);
        handleSubmitWithStyles(newStyles);
      }, 100);
    }
  };

  // Funkcja wyszukiwania z stylami
  const handleSubmitWithStyles = (styles: string[]) => {
    logger.info('src/components/dashboard/useDashboardState.ts: Wyszukiwanie z stylami:', styles);
    
    try {
      setIsLoading(true);
      setError('');

      const criteria: SearchCriteria = {
        wzrost: parseInt(formData.height.value),
        waga: parseInt(formData.weight.value),
        poziom: parseInt(formData.level),
        plec: formData.gender.toUpperCase().trim() as 'M' | 'K',
        styl_jazdy: styles.length > 0 ? styles : undefined,
        dateFrom: parseDate(formData.dateFrom),
        dateTo: parseDate(formData.dateTo)
      };

      logger.info('src/components/dashboard/useDashboardState.ts: Kryteria wyszukiwania z stylami:', criteria);

      setCurrentCriteria(criteria);

      const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
      setSearchResults(sortedResults);

      logger.info('src/components/dashboard/useDashboardState.ts: Zaktualizowano wyniki z stylami:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      logger.error('src/components/dashboard/useDashboardState.ts: Błąd wyszukiwania z stylami:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja głównego wyszukiwania
  const handleSubmit = (customFormData?: FormData) => {
    const dataToValidate = customFormData || formData;
    logger.info('src/components/dashboard/useDashboardState.ts: Rozpoczęcie walidacji formularza');
    
    setFormErrors(initialFormErrors);
    setError('');

    const validation = validateForm(dataToValidate);
    
    if (!validation.isValid) {
      logger.info('src/components/dashboard/useDashboardState.ts: Formularz zawiera błędy walidacji');
      setFormErrors(validation.errors);
      setError('Proszę poprawić błędy w formularzu');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const criteria: SearchCriteria = {
        wzrost: parseInt(dataToValidate.height.value),
        waga: parseInt(dataToValidate.weight.value),
        poziom: parseInt(dataToValidate.level),
        plec: dataToValidate.gender.toUpperCase().trim() as 'M' | 'K',
        styl_jazdy: selectedStyles.length > 0 ? selectedStyles : undefined,
        dateFrom: parseDate(dataToValidate.dateFrom),
        dateTo: parseDate(dataToValidate.dateTo)
      };

      logger.info('src/components/dashboard/useDashboardState.ts: Kryteria wyszukiwania:', criteria);

      setCurrentCriteria(criteria);

      const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      setSuggestions([]);

      const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
      setSearchResults(sortedResults);

      if (!equipmentTypeFilter && !categoryFilter) {
        logger.info('src/components/dashboard/useDashboardState.ts: Automatyczny wybór kategorii (brak filtrów)');
        autoSelectFirstCategory(sortedResults);
      } else {
        logger.info('src/components/dashboard/useDashboardState.ts: Pomijam automatyczny wybór - użytkownik wybrał filtry:', equipmentTypeFilter, categoryFilter);
      }

      saveSearchHistory({
        criteria,
        resultsCount: {
          idealne: results.idealne.length,
          alternatywy: results.alternatywy.length,
          poziom_za_nisko: results.poziom_za_nisko.length,
          inna_plec: results.inna_plec.length,
          na_sile: results.na_sile.length,
          wszystkie: results.wszystkie.length
        }
      });

      logger.info('src/components/dashboard/useDashboardState.ts: Znaleziono wyników:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      logger.error('src/components/dashboard/useDashboardState.ts: Błąd wyszukiwania:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja czyszczenia formularza
  const handleClear = () => {
    logger.info('src/components/dashboard/useDashboardState.ts: Czyszczenie formularza aktywnej karty');
    const defaultData = {
      dateFrom: { day: '', month: '', year: '' },
      dateTo: { day: '', month: '', year: '' },
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' },
      level: '',
      gender: '',
      shoeSize: ''
    };
    
    updateActiveTab({
      formData: defaultData,
      selectedStyles: [],
      searchResults: null,
      error: '',
      formErrors: initialFormErrors,
      currentCriteria: null
    });
    
    setEquipmentTypeFilter('');
    setCategoryFilter('');
    
    logger.info('src/components/dashboard/useDashboardState.ts: Aktywna karta wyczyszczona');
  };

  // Funkcje obsługi hasła pracownika
  const handlePasswordSubmit = (password: string) => {
    logger.info('src/components/dashboard/useDashboardState.ts: Weryfikacja hasła pracownika');
    if (password === EMPLOYEE_PASSWORD) {
      logger.info('src/components/dashboard/useDashboardState.ts: Hasło poprawne - przełączanie na tryb pracownika');
      setIsEmployeeMode(true);
      setIsPasswordModalOpen(false);
      setPasswordError('');
    } else {
      logger.info('src/components/dashboard/useDashboardState.ts: Hasło błędne - pozostanie w trybie klienta');
      setPasswordError('Nieprawidłowe hasło. Spróbuj ponownie.');
    }
  };

  const handleToggleEmployeeMode = () => {
    if (isEmployeeMode) {
      logger.info('src/components/dashboard/useDashboardState.ts: Wylogowanie - przełączanie na tryb klienta');
      setIsEmployeeMode(false);
      if (appMode === 'reservations') {
        setAppMode('search');
      }
    } else {
      setIsPasswordModalOpen(true);
      setPasswordError('');
    }
  };

  // Funkcje przełączania trybów aplikacji
  const handleBrowseMode = (hasGroup: boolean = false) => {
    setHasSelectedGroup(hasGroup);
    setAppMode('browse');
  };

  const handleBackToSearch = () => {
    setHasSelectedGroup(false);
    setAppMode('search');
  };

  const handleShowAllEquipment = () => {
    logger.info('src/components/dashboard/useDashboardState.ts: Przycisk Cały sprzęt - otwieranie Browse bez filtrów');
    setEquipmentTypeFilter('');
    setCategoryFilter('');
    handleBrowseMode(false);
  };

  const handleQuickFilterInSearch = (type: string, category: string) => {
    logger.info(`Otwieranie przeglądania - typ: ${type}, kategoria: ${category}`);
    
    setSelectedStyles([]);
    setEquipmentTypeFilter(type);
    setCategoryFilter(category);
    handleBrowseMode(true);
    
    logger.info(`Filtry ustawione - typ: ${type}, kategoria: ${category}, otwieram "Przeglądaj"`);
  };

  // Funkcja aktualizacji stanu pól wyszukiwania
  const handleFilterSearchChange = (filterKey: FilterKey, field: 'searchTerm' | 'searchFlex' | 'searchDlugosc', value: string) => {
    logger.info(`Aktualizuję stan wyszukiwania dla filtra ${filterKey}, pole: ${field}, wartość: ${value}`);
    
    updateActiveTab({
      filterSearchStates: {
        ...activeTab.filterSearchStates,
        [filterKey]: {
          ...activeTab.filterSearchStates[filterKey],
          [field]: value
        }
      }
    });
  };

  // Funkcja pomocnicza do zaznaczania całego tekstu przy kliknięciu
  const handleDateFieldClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.value) {
      input.select();
    }
  };

  // Funkcja ładowania bazy danych
  const loadDatabase = async () => {
    try {
      logger.info('src/components/dashboard/useDashboardState.ts: Ładuję bazę danych nart...');
      
      const isServerAvailable = await SkiDataService.checkServerHealth();
      
      let skis: SkiData[];
      if (isServerAvailable) {
        logger.info('src/components/dashboard/useDashboardState.ts: Ładuję dane z API serwera');
        skis = await SkiDataService.getAllSkis();
      } else {
        logger.info('src/components/dashboard/useDashboardState.ts: Serwer niedostępny - ładuję ze statycznego CSV');
        skis = await CSVParser.loadFromPublic();
      }
      
      setSkisDatabase(skis);
      logger.info(`Załadowano ${skis.length} nart z bazy danych`);
    } catch (err) {
      logger.error('src/components/dashboard/useDashboardState.ts: Błąd ładowania bazy:', err);
      setError('Nie udało się załadować bazy danych nart');
    }
  };

  // Computed values
  const computedInitialFilter = useMemo(() => {
    logger.debug(`Obliczanie initialFilter - equipmentTypeFilter: ${equipmentTypeFilter}, categoryFilter: ${categoryFilter}`);
    
    if (equipmentTypeFilter === 'DESKI') {
      logger.info('src/components/dashboard/useDashboardState.ts: initialFilter = DESKI');
      return 'DESKI';
    }
    if (equipmentTypeFilter === 'BUTY_SNOWBOARD') {
      logger.info('src/components/dashboard/useDashboardState.ts: initialFilter = BUTY_SNOWBOARD');
      return 'BUTY_SNOWBOARD';
    }
    if (equipmentTypeFilter === 'BUTY' && categoryFilter === 'JUNIOR') {
      logger.info('src/components/dashboard/useDashboardState.ts: initialFilter = BUTY_JUNIOR');
      return 'BUTY_JUNIOR';
    }
    if (equipmentTypeFilter === 'BUTY' && categoryFilter === 'DOROSLE') {
      logger.info('src/components/dashboard/useDashboardState.ts: initialFilter = DOROSLE');
      return 'DOROSLE';
    }
    if (equipmentTypeFilter === 'NARTY' && categoryFilter) {
      logger.debug(`initialFilter = ${categoryFilter} (NARTY)`);
      return categoryFilter;
    }
    logger.info('src/components/dashboard/useDashboardState.ts: initialFilter = all (domyślny)');
    return 'all';
  }, [equipmentTypeFilter, categoryFilter]);

  const filteredSearchResults = filterSearchResults(searchResults);
  const groupedResults: SearchResults | null = filteredSearchResults ? {
    idealne: groupMatchesByModel(filteredSearchResults.idealne),
    alternatywy: groupMatchesByModel(filteredSearchResults.alternatywy),
    poziom_za_nisko: groupMatchesByModel(filteredSearchResults.poziom_za_nisko),
    inna_plec: groupMatchesByModel(filteredSearchResults.inna_plec),
    na_sile: groupMatchesByModel(filteredSearchResults.na_sile),
    wszystkie: filteredSearchResults.wszystkie
  } : null;

  // Wczytaj karty z LocalStorage przy starcie
  useEffect(() => {
    logger.info('src/components/dashboard/useDashboardState.ts: Wczytuję karty z LocalStorage przy starcie aplikacji');
    const savedTabs = loadAllTabs();
    
    if (savedTabs && savedTabs.tabs.length > 0) {
      logger.info('src/components/dashboard/useDashboardState.ts: Znaleziono zapisane karty:', savedTabs);
      
      const restoredTabs = savedTabs.tabs.map((savedTab: { id: string; label: string; formData: FormData; selectedStyles?: string[] }) => ({
        id: savedTab.id,
        label: savedTab.label,
        formData: savedTab.formData,
        selectedStyles: savedTab.selectedStyles || [],
        searchResults: null,
        currentCriteria: null,
        formErrors: initialFormErrors,
        error: '',
        isLoading: false,
        expandedCategories: {
          alternatywy: false,
          poziom_za_nisko: false,
          inna_plec: false,
          na_sile: false
        },
        expandedRows: {
          idealne: [],
          alternatywy: [],
          poziom_za_nisko: [],
          inna_plec: [],
          na_sile: []
        },
        filterSearchStates: (savedTab as any).filterSearchStates || {
          all: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          TOP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          VIP: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          BUTY_JUNIOR: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          DOROSLE: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          DESKI: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
          BUTY_SNOWBOARD: { searchTerm: '', searchFlex: '', searchDlugosc: '' },
        }
      }));
      
      setTabs(restoredTabs);
      setActiveTabId(savedTabs.activeTabId);
      logger.info('src/components/dashboard/useDashboardState.ts: Karty przywrócone z LocalStorage');
    } else {
      logger.info('src/components/dashboard/useDashboardState.ts: Brak zapisanych kart, używam domyślnych');
    }
  }, []);

  // Automatycznie zapisuj karty do LocalStorage
  useEffect(() => {
    if (tabs.length > 0) {
      logger.info('src/components/dashboard/useDashboardState.ts: Auto-zapisywanie kart do LocalStorage');
      saveAllTabs(tabs, activeTabId);
    }
  }, [tabs, activeTabId]);

  // Ładowanie bazy danych przy starcie
  useEffect(() => {
    loadDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatyczne wyszukiwanie gdy wszystkie pola są wypełnione
  const autoSearchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
    }

    logger.info('src/components/dashboard/useDashboardState.ts: Zmiana w formData - sprawdzam czy uruchomić automatyczne wyszukiwanie');

    const isFormComplete = 
      formData.dateFrom.day !== '' &&
      formData.dateFrom.month !== '' &&
      formData.dateFrom.year !== '' &&
      formData.dateTo.day !== '' &&
      formData.dateTo.month !== '' &&
      formData.dateTo.year !== '' &&
      formData.height.value !== '' &&
      formData.weight.value !== '' &&
      formData.level !== '' &&
      formData.gender !== '';

    logger.info('src/components/dashboard/useDashboardState.ts: Formularz kompletny:', isFormComplete);

    if (isFormComplete) {
      const validation = validateForm(formData);
      
      if (validation.isValid) {
        logger.info('src/components/dashboard/useDashboardState.ts: Formularz wypełniony i poprawny - uruchamiam automatyczne wyszukiwanie za 500ms');
        
        autoSearchTimerRef.current = setTimeout(() => {
          logger.info('src/components/dashboard/useDashboardState.ts: Uruchamiam automatyczne wyszukiwanie');
          handleSubmit(formData);
        }, 500);
      } else {
        logger.info('src/components/dashboard/useDashboardState.ts: Formularz wypełniony ale zawiera błędy - nie uruchamiam wyszukiwania');
      }
    } else {
      logger.info('src/components/dashboard/useDashboardState.ts: Formularz niekompletny - nie uruchamiam automatycznego wyszukiwania');
    }

    return () => {
      if (autoSearchTimerRef.current) {
        clearTimeout(autoSearchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, selectedStyles, activeTabId, skisDatabase.length]);

  return {
    // Stany
    tabs,
    activeTabId,
    activeTab,
    appMode,
    hasSelectedGroup,
    equipmentTypeFilter,
    categoryFilter,
    isPasswordModalOpen,
    passwordError,
    isEmployeeMode,
    skisDatabase,
    suggestions,
    
    // Skróty do danych aktywnej karty
    formData,
    selectedStyles,
    searchResults,
    currentCriteria,
    formErrors,
    error,
    isLoading,
    expandedCategories,
    expandedRows,
    
    // Funkcje zarządzania kartami
    updateActiveTab,
    addNewTab,
    removeTab,
    setActiveTabId,
    
    // Funkcje formularza
    setFormData,
    setSelectedStyles,
    setFormErrors,
    setError,
    setIsLoading,
    setCurrentCriteria,
    setExpandedCategories,
    setExpandedRows,
    
    // Funkcje wyszukiwania
    handleInputChange,
    handleSubmit,
    handleSubmitWithStyles,
    handleStyleToggle,
    handleClear,
    
    // Funkcje trybów aplikacji
    setAppMode,
    setHasSelectedGroup,
    handleBrowseMode,
    handleBackToSearch,
    handleShowAllEquipment,
    handleQuickFilterInSearch,
    
    // Funkcje filtrów
    setEquipmentTypeFilter,
    setCategoryFilter,
    filterSearchResults,
    groupMatchesByModel,
    
    // Funkcje pracownika
    handlePasswordSubmit,
    handleToggleEmployeeMode,
    setIsPasswordModalOpen,
    setPasswordError,
    
    // Funkcje pomocnicze
    parseDate,
    handleDateFieldClick,
    handleDateChange,
    handleBrowseCriteriaChange,
    handleFilterSearchChange,
    
    // Funkcje kategorii i kart
    toggleCategory,
    isCardExpandedInRow,
    toggleCardInRow,
    
    // Funkcje bazy danych
    loadDatabase,
    
    // Computed values
    computedInitialFilter,
    filteredSearchResults,
    groupedResults,
    
    // Refs
    dayFromRef,
    monthFromRef,
    dayToRef,
    monthToRef,
    heightRef,
    weightRef,
    levelRef,
    genderRef,
    shoeSizeRef,
  };
};
