import React, { useState, useEffect } from 'react';
import { CSVParser } from '../utils/csvParser';
import { SkiMatchingServiceV2 } from '../services/skiMatchingServiceV2';
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
  type FormErrors 
} from '../utils/formValidation';
import { saveUserSession, loadUserSession, clearUserSession, saveSearchHistory } from '../utils/localStorage';
import { DetailedCompatibility } from './DetailedCompatibility';
import { SkiStyleBadge } from './SkiStyleBadge';
import { BrowseSkisComponent } from './BrowseSkisComponent';
import { ReservationsView } from './ReservationsView';
import type { SkiData, SearchResults, SearchCriteria } from '../types/ski.types';

interface FormData {
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
  // USUNIĘTO: preferences - teraz filtry stylu są oddzielne
}

// NOWY INTERFEJS: Dane dla pojedynczej karty (osoby)
interface TabData {
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
}

const AnimaComponent: React.FC = () => {
  // NOWY STAN: System kart - każda karta to jedna osoba
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
        gender: ''
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
        na_sile: false
      },
      expandedRows: {
        idealne: [],
        alternatywy: [],
        poziom_za_nisko: [],
        inna_plec: [],
        na_sile: []
      }
    }
  ]);
  
  const [activeTabId, setActiveTabId] = useState<string>('1');

  const [skisDatabase, setSkisDatabase] = useState<SkiData[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // NOWY STAN: Tryb aplikacji (wyszukiwanie vs przeglądanie vs rezerwacje)
  const [appMode, setAppMode] = useState<'search' | 'browse' | 'reservations'>('search');

  // HELPER: Pobierz aktywną kartę
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  
  // HELPER: Aktualizuj aktywną kartę
  const updateActiveTab = (updates: Partial<TabData>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  // Skróty do danych aktywnej karty (dla kompatybilności z istniejącym kodem)
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

  // NOWY STAN: Rozwijanie kategorii (pierwsze 6 lub wszystkie)
  const [expandedCategories, setExpandedCategories] = useState({
    alternatywy: false,
    poziom_za_nisko: false,
    inna_plec: false,
    na_sile: false
  });

  // NOWY STAN: Rozwijanie szczegółów w rzędach (maksymalnie 3 karty na rząd)
  const [expandedRows, setExpandedRows] = useState<Record<string, number[]>>({
    idealne: [],
    alternatywy: [],
    poziom_za_nisko: [],
    inna_plec: [],
    na_sile: []
  });

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

  // Funkcja do przełączania konkretnej karty w rzędzie (rozwija wszystkie karty w rzędzie)
  const toggleCardInRow = (category: string) => {
    setExpandedRows(prev => {
      const currentExpanded = prev[category] || [];
      
      if (currentExpanded.length > 0) {
        // Jeśli są już rozwinięte karty - zwiń wszystkie
        return {
          ...prev,
          [category]: []
        };
      } else {
        // Jeśli nie ma rozwiniętych kart - rozwiń wszystkie karty w tym rzędzie
        const cardsToExpand = [];
        
        // Rozwiń wszystkie karty w rzędzie
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

  // Funkcja grupowania wyników po modelu (jedna karta na model nart)
  // Narty tego samego modelu mają już kwadraciki z numerami sztuk w DetailedCompatibility
  const groupMatchesByModel = (matches: any[]): any[] => {
    const grouped = new Map<string, any[]>();
    
    matches.forEach(match => {
      const key = `${match.ski.MARKA}|${match.ski.MODEL}|${match.ski.DLUGOSC}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(match);
    });
    
    // Zwróć pierwszy match z każdej grupy (reprezentant grupy)
    // Kwadraciki dostępności są generowane w DetailedCompatibility dla wszystkich sztuk tego modelu
    return Array.from(grouped.values()).map(group => group[0]);
  };

  // Funkcja do parsowania daty z formularza
  const parseDate = (dateObj: { day: string; month: string; year: string }): Date | undefined => {
    if (!dateObj.day || !dateObj.month || !dateObj.year) {
      return undefined;
    }
    
    const day = parseInt(dateObj.day);
    const month = parseInt(dateObj.month);
    const year = parseInt(dateObj.year);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return undefined;
    }
    
    // Miesiące w JavaScript są 0-indexowane
    return new Date(year, month - 1, day);
  };

  /**
   * Konwertuje preferencje stylu jazdy na skróconą formę
   */

  /**
   * Konwertuje preferencje użytkownika na skróconą formę
   */

  // Wczytaj dane sesji przy starcie aplikacji
  useEffect(() => {
    console.log('src/components/AnimaComponent.tsx: Wczytuję dane sesji przy starcie aplikacji');
    const savedSession = loadUserSession();
    if (savedSession) {
      console.log('src/components/AnimaComponent.tsx: Znaleziono zapisane dane sesji:', savedSession);
      console.log('src/components/AnimaComponent.tsx: Daty z LocalStorage - dateFrom:', savedSession.formData.dateFrom, 'dateTo:', savedSession.formData.dateTo);
      
      // Sprawdź czy daty mają stare wartości (np. year: '2025' bez day i month)
      const hasInvalidDates = 
        (savedSession.formData.dateFrom.year && !savedSession.formData.dateFrom.day && !savedSession.formData.dateFrom.month) ||
        (savedSession.formData.dateTo.year && !savedSession.formData.dateTo.day && !savedSession.formData.dateTo.month);
      
      if (hasInvalidDates) {
        console.log('src/components/AnimaComponent.tsx: Wykryto nieprawidłowe daty w LocalStorage, czyszczę...');
        clearUserSession();
        console.log('src/components/AnimaComponent.tsx: LocalStorage wyczyszczony, używam domyślnych wartości');
        return;
      }
      
      // Upewnij się, że struktura danych jest kompletna
      const completeFormData = {
        ...savedSession.formData,
        dateFrom: {
          day: savedSession.formData.dateFrom.day || '',
          month: savedSession.formData.dateFrom.month || '',
          year: savedSession.formData.dateFrom.year || ''
        },
        dateTo: {
          day: savedSession.formData.dateTo.day || '',
          month: savedSession.formData.dateTo.month || '',
          year: savedSession.formData.dateTo.year || ''
        },
        height: {
          value: savedSession.formData.height.value || '',
          unit: savedSession.formData.height.unit || 'cm'
        },
        weight: {
          value: savedSession.formData.weight.value || '',
          unit: savedSession.formData.weight.unit || 'kg'
        }
      };
      console.log('src/components/AnimaComponent.tsx: Zaktualizowane dane formularza:', completeFormData);
      setFormData(completeFormData);
    } else {
      console.log('src/components/AnimaComponent.tsx: Brak zapisanych danych sesji, używam domyślnych');
    }
  }, []);

  // Refs dla automatycznego przechodzenia między polami
  const dayFromRef = React.useRef<HTMLInputElement>(null);
  const monthFromRef = React.useRef<HTMLInputElement>(null);
  const dayToRef = React.useRef<HTMLInputElement>(null);
  const monthToRef = React.useRef<HTMLInputElement>(null);
  const heightRef = React.useRef<HTMLInputElement>(null);
  const weightRef = React.useRef<HTMLInputElement>(null);
  const levelRef = React.useRef<HTMLInputElement>(null);
  const genderRef = React.useRef<HTMLInputElement>(null);

  // Ładowanie bazy danych przy starcie
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setIsLoading(true);
        const skis = await CSVParser.loadFromPublic();
        setSkisDatabase(skis);
        console.log(`Załadowano ${skis.length} nart z bazy danych`);
      } catch (err) {
        console.error('Błąd ładowania bazy:', err);
        setError('Nie udało się załadować bazy danych nart');
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabase();
  }, []);

  const handleInputChange = (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => {
    console.log(`src/components/AnimaComponent.tsx: Zmiana pola - sekcja: ${section}, pole: ${field}, wartość: ${value}`);
    
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
      console.log(`src/components/AnimaComponent.tsx: Walidacja wzrostu - wartość: ${value}, isValid: ${isValid}`);
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
    }

    // Jeśli walidacja nie przeszła, nie aktualizuj wartości
    if (!isValid) {
      console.log(`src/components/AnimaComponent.tsx: Walidacja nie przeszła - ${errorMessage}`);
      return;
    }

    console.log(`src/components/AnimaComponent.tsx: Walidacja przeszła, aktualizuję dane`);

    // Aktualizuj dane formularza (bez formatowania)
    if (section === 'dateFrom' || section === 'dateTo') {
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    } else if (section === 'height' || section === 'weight') {
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    } else {
      console.log(`src/components/AnimaComponent.tsx: Aktualizuję ${section} na wartość: ${value}`);
      setFormData(prev => {
        const updatedData = {
          ...prev,
          [section]: value
        };
        // Zapisz dane sesji po każdej zmianie
        saveUserSession(updatedData);
        return updatedData;
      });
    }

    // Wyczyść błędy dla tego pola
    setFormErrors(prev => {
      const newErrors = { ...prev };
      if (section === 'dateFrom' || section === 'dateTo') {
        newErrors[section] = { ...newErrors[section], [field]: '' };
      } else if (section === 'height' || section === 'weight' || section === 'level' || section === 'gender') {
        newErrors[section] = '';
      }
      return newErrors;
    });

    // Automatyczne przechodzenie do następnego pola
    console.log(`src/components/AnimaComponent.tsx: Sprawdzanie automatycznego przechodzenia - sekcja: ${section}, pole: ${field}, wartość: "${value}", długość: ${value.length}`);
    
    if (inputRef) {
      // Dzień "od" → Miesiąc "od"
      if (section === 'dateFrom' && field === 'day' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do miesiąca "od"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Miesiąc "od" → Dzień "do"
      else if (section === 'dateFrom' && field === 'month' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do dnia "do"`);
        const nextInput = dayToRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Dzień "do" → Miesiąc "do"
      else if (section === 'dateTo' && field === 'day' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do miesiąca "do"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Miesiąc "do" → Wzrost
      else if (section === 'dateTo' && field === 'month' && value.length === 2) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do wzrostu`);
        const nextInput = heightRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Wzrost → Waga (po 3 cyfrach lub gdy wartość >= 100)
      else if (section === 'height' && field === 'value') {
        const heightNum = parseInt(value);
        console.log(`src/components/AnimaComponent.tsx: Sprawdzanie wzrostu - wartość: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
        console.log(`src/components/AnimaComponent.tsx: Warunek 1 (długość >= 3): ${value.length >= 3}`);
        console.log(`src/components/AnimaComponent.tsx: Warunek 2 (długość >= 2 && liczba >= 100): ${value.length >= 2 && heightNum >= 100}`);
        
        if (value.length >= 3 || (value.length >= 2 && heightNum >= 100)) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do wagi - wzrost: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
          const nextInput = weightRef.current;
          if (nextInput) {
            console.log(`src/components/AnimaComponent.tsx: Znaleziono pole wagi, przechodzę`);
            nextInput.focus();
          } else {
            console.log(`src/components/AnimaComponent.tsx: Nie znaleziono pola wagi`);
          }
        } else {
          console.log(`src/components/AnimaComponent.tsx: Warunek nie spełniony - nie przechodzę`);
        }
      }
      // Waga → Poziom (po 2 cyfrach lub 3 cyfrach jeśli zaczyna się na 1 lub 2)
      else if (section === 'weight' && field === 'value') {
        if (value.length === 2 && !value.startsWith('1') && !value.startsWith('2')) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do poziomu - waga: ${value} (2 cyfry, nie zaczyna się na 1/2)`);
          const nextInput = levelRef.current;
          if (nextInput) {
            nextInput.focus();
          }
        } else if (value.length === 3 && (value.startsWith('1') || value.startsWith('2'))) {
          console.log(`src/components/AnimaComponent.tsx: Przechodzenie do poziomu - waga: ${value} (3 cyfry, zaczyna się na 1/2)`);
          const nextInput = levelRef.current;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }
      // Poziom → Płeć (po 1 cyfrze)
      else if (section === 'level' && value.length >= 1) {
        console.log(`src/components/AnimaComponent.tsx: Przechodzenie do płci - poziom: ${value}`);
        const nextInput = genderRef.current;
        if (nextInput) {
          nextInput.focus();
        }
      }
      // Płeć → Automatyczne wyszukiwanie (po wpisaniu M lub K)
      else if (section === 'gender' && (value.toUpperCase() === 'M' || value.toUpperCase() === 'K')) {
        console.log(`src/components/AnimaComponent.tsx: Wypełniono płeć, automatyczne wyszukiwanie`);
        // Przygotuj aktualne dane z nową płcią
        const updatedData = { ...formData, gender: value };
        console.log(`src/components/AnimaComponent.tsx: Zaktualizowane dane przed wyszukiwaniem:`, updatedData);
        
        // Aktualizuj stan i od razu wyszukaj z aktualnymi danymi
        setFormData(updatedData);
        setTimeout(() => {
          handleSubmit(updatedData);
        }, 50);
      }
    }
  };

  // USUNIĘTO: handlePreferenceChange - teraz używamy handleStyleToggle

  /**
   * Obsługuje zmianę pojedynczego filtra stylu (dla checkboxów)
   */
  const handleStyleToggle = (style: string) => {
    const newStyles = selectedStyles.includes(style)
      ? selectedStyles.filter(s => s !== style)
      : [...selectedStyles, style];
    
    console.log(`src/components/AnimaComponent.tsx: Przełączenie stylu ${style}, nowe style:`, newStyles);
    setSelectedStyles(newStyles);
    
    // Automatyczne wyszukiwanie po KAŻDEJ zmianie filtrów (jeśli są już wyniki)
    if (searchResults) {
      setTimeout(() => {
        console.log(`src/components/AnimaComponent.tsx: Automatyczne wyszukiwanie po przełączeniu filtra`);
        handleSubmitWithStyles(newStyles);
      }, 100);
    }
  };

  /**
   * Wyszukuje narty z określonymi stylami (dla automatycznego wyszukiwania po zmianie filtrów)
   */
  const handleSubmitWithStyles = (styles: string[]) => {
    console.log('src/components/AnimaComponent.tsx: Wyszukiwanie z stylami:', styles);
    
    try {
      setIsLoading(true);
      setError('');

      // Przygotuj kryteria wyszukiwania z przekazanymi stylami
      const criteria: SearchCriteria = {
        wzrost: parseInt(formData.height.value),
        waga: parseInt(formData.weight.value),
        poziom: parseInt(formData.level),
        plec: formData.gender.toUpperCase().trim() as 'M' | 'K',
        styl_jazdy: styles.length > 0 ? styles : undefined,
        dateFrom: parseDate(formData.dateFrom),
        dateTo: parseDate(formData.dateTo)
      };

      console.log('src/components/AnimaComponent.tsx: Kryteria wyszukiwania z stylami:', criteria);

      // Zapisz kryteria dla MatchIndicators
      setCurrentCriteria(criteria);

      // Wyszukaj pasujące narty
      const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      // Sortuj wyniki według dostępności i dopasowania
      const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
      setSearchResults(sortedResults);

      console.log('src/components/AnimaComponent.tsx: Zaktualizowano wyniki z stylami:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('src/components/AnimaComponent.tsx: Błąd wyszukiwania z stylami:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (customFormData?: FormData) => {
    const dataToValidate = customFormData || formData;
    console.log('src/components/AnimaComponent.tsx: Rozpoczęcie walidacji formularza');
    console.log('src/components/AnimaComponent.tsx: Aktualne dane formularza:', dataToValidate);
    
    // Wyczyść poprzednie błędy
    setFormErrors(initialFormErrors);
    setError('');

    // Waliduj formularz
    const validation = validateForm(dataToValidate);
    
    if (!validation.isValid) {
      console.log('src/components/AnimaComponent.tsx: Formularz zawiera błędy walidacji');
      setFormErrors(validation.errors);
      setError('Proszę poprawić błędy w formularzu');
      return;
    }

    // USUNIĘTO: walidacja preferencji - teraz filtry stylu są opcjonalne

    try {
      setIsLoading(true);
      setError('');

      // Przygotuj kryteria wyszukiwania
      const criteria: SearchCriteria = {
        wzrost: parseInt(dataToValidate.height.value),
        waga: parseInt(dataToValidate.weight.value),
        poziom: parseInt(dataToValidate.level),
        plec: dataToValidate.gender.toUpperCase().trim() as 'M' | 'K',
        styl_jazdy: selectedStyles.length > 0 ? selectedStyles : undefined, // NOWY FORMAT: tablica stylów
        dateFrom: parseDate(dataToValidate.dateFrom),
        dateTo: parseDate(dataToValidate.dateTo)
      };

      console.log('src/components/AnimaComponent.tsx: Kryteria wyszukiwania:', criteria);

      // Zapisz kryteria dla MatchIndicators
      setCurrentCriteria(criteria);

      // Wyszukaj pasujące narty
      const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      // Generuj inteligentne sugestie (wyłączone na razie)
      // const smartSuggestions = SkiMatchingServiceV2.generateSuggestions(skisDatabase, criteria, results);
      // setSuggestions(smartSuggestions);
      setSuggestions([]); // Wyłączone sugestie

      // Sortuj wyniki według dostępności i dopasowania
      const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
      setSearchResults(sortedResults);

      // Zapisz historię wyszukiwania
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

      console.log('src/components/AnimaComponent.tsx: Znaleziono wyników:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('src/components/AnimaComponent.tsx: Błąd wyszukiwania:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  // Event handler dla przycisku "Wyszukaj"
  const handleSubmitClick = (event: React.MouseEvent) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleClear = () => {
    console.log('src/components/AnimaComponent.tsx: Czyszczenie formularza');
    const defaultData = {
      dateFrom: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
      dateTo: { day: '', month: '', year: '' }, // Puste daty - opcjonalne
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' },
      level: '',
      gender: ''
      // USUNIĘTO: preferences
    };
    
    setFormData(defaultData);
    setSelectedStyles([]); // NOWE: wyczyść filtry stylu
    setSearchResults(null);
    setError('');
    setFormErrors(initialFormErrors);
    
    // Wyczyść dane sesji z LocalStorage
    clearUserSession();
    console.log('src/components/AnimaComponent.tsx: Dane sesji wyczyszczone z LocalStorage');
  };

  // Grupowanie wyników po modelu (jedna karta na model nart)
  // Narty tego samego modelu mają już kwadraciki z numerami sztuk w DetailedCompatibility
  const groupedResults = searchResults ? {
    idealne: groupMatchesByModel(searchResults.idealne),
    alternatywy: groupMatchesByModel(searchResults.alternatywy),
    poziom_za_nisko: groupMatchesByModel(searchResults.poziom_za_nisko),
    inna_plec: groupMatchesByModel(searchResults.inna_plec),
    na_sile: groupMatchesByModel(searchResults.na_sile)
  } : null;

  return (
    <div className="min-h-screen bg-[#386BB2]">
      {/* Header Section - stałe wymiary */}
      <div className="w-[1100px] h-[200px] bg-[#386BB2] flex items-start justify-between p-2 mx-auto">
        {/* Avatar */}
        <div className="w-[180px] h-[180px] bg-[#D9D9D9] rounded-full" />
        
        {/* Main Content Container */}
        <div className="w-[890px] h-[180px] bg-[#194576] rounded-[20px] flex items-center justify-start gap-3 p-2">
            
            {/* Left Section - Personal Data */}
            <div className="w-[307px] h-[160px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-1.5">
              {/* Date From */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] border border-white flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data od:</span>
                </div>
                <input
                  ref={dayFromRef}
                  type="text"
                  placeholder="DD"
                  value={formData.dateFrom.day}
                  onChange={(e) => handleInputChange('dateFrom', 'day', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  ref={monthFromRef}
                  type="text"
                  placeholder="MM"
                  value={formData.dateFrom.month}
                  onChange={(e) => handleInputChange('dateFrom', 'month', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <select
                  value={formData.dateFrom.year}
                  onChange={(e) => handleInputChange('dateFrom', 'year', e.target.value)}
                  className={`w-[61px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateFrom.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                >
                  <option value="">Rok</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
            </div>

              {/* Date To */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data do:</span>
                </div>
                <input
                  ref={dayToRef}
                  type="text"
                  placeholder="DD"
                  value={formData.dateTo.day}
                  onChange={(e) => handleInputChange('dateTo', 'day', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  ref={monthToRef}
                  type="text"
                  placeholder="MM"
                  value={formData.dateTo.month}
                  onChange={(e) => handleInputChange('dateTo', 'month', e.target.value, e.target)}
                  className={`w-[38px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <select
                  value={formData.dateTo.year}
                  onChange={(e) => handleInputChange('dateTo', 'year', e.target.value)}
                  className={`w-[61px] h-[29px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.dateTo.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                >
                  <option value="">Rok</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              {/* Height */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">📏 Wzrost:</span>
                </div>
                <input
                  ref={heightRef}
                  type="text"
                  placeholder="180"
                  value={formData.height.value}
                  onChange={(e) => handleInputChange('height', 'value', e.target.value, e.target)}
                  className={`w-[112px] h-[31px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.height ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <div className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">cm</span>
                </div>
              </div>

              {/* Weight */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">⚖️ Waga:</span>
                </div>
                <input
                  ref={weightRef}
                  type="text"
                  placeholder="70"
                  value={formData.weight.value}
                  onChange={(e) => handleInputChange('weight', 'value', e.target.value, e.target)}
                  className={`w-[112px] h-[31px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                    formErrors.weight ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                  }`}
                />
                <div className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">kg</span>
                </div>
              </div>
            </div>

            {/* Center Section - Level and Gender */}
            <div className="w-[230px] h-[140px] flex flex-col justify-start items-center gap-[5px]">
              {/* Client Data Title */}
              <div className="w-[197px] h-[39px] bg-[#2C699F] rounded-[10px] border border-white flex justify-center items-center">
                <div className="text-center justify-center text-white text-[21px] font-black font-['Inter'] italic underline leading-[29px]">Dane klienta</div>
              </div>
              
              {/* Level and Gender Section */}
              <div className="w-[230px] h-[96px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-start gap-1.5">
                {/* Level */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">Poziom:</span>
                  </div>
                  <input
                    ref={levelRef}
                    type="text"
                    placeholder="1-6"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', 'value', e.target.value, e.target)}
                    className={`w-[60px] h-[35px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                      formErrors.level ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                    }`}
                  />
                </div>

                {/* Gender */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">👤 Płeć:</span>
                  </div>
                  <input
                    ref={genderRef}
                    type="text"
                    placeholder="M/K"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', 'value', e.target.value, e.target)}
                    className={`w-[60px] h-[35px] rounded-[5px] text-white text-center text-xs font-black font-['Inter'] ${
                      formErrors.gender ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Right Section - Style Filters and Action Buttons */}
            <div className="w-[300px] h-[160px] p-1 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-[5px]">
              {/* Style Filters Title */}
              <div className="w-[140px] h-[20px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                <div className="text-center justify-center text-white text-[14px] font-black font-['Inter'] italic underline leading-[20px]">Style jazdy:</div>
              </div>

              {/* Style Filter Checkboxes - 2 rows */}
              <div className="w-[300px] flex flex-col justify-center items-center gap-1">
                {/* First row */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['SL', 'G'].map((style) => (
                    <label key={style} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStyles.includes(style)}
                        onChange={() => handleStyleToggle(style)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">
                        {style === 'SL' ? 'Slalom' : 'Gigant'}
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* Second row */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['SLG', 'OFF'].map((style) => (
                    <label key={style} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStyles.includes(style)}
                        onChange={() => handleStyleToggle(style)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">
                        {style === 'SLG' ? 'Pomiędzy' : 'Poza trasę'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-[299px] h-[75px] flex justify-center items-center gap-[5px] flex-wrap">
                <button
                  onClick={handleSubmitClick}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🔍 Wyszukaj</span>
                </button>
                <button
                  onClick={handleClear}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🗑️ Wyczyść</span>
                </button>
                <button 
                  onClick={() => setAppMode('browse')}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">📋 Przeglądaj</span>
                </button>
                <button 
                  onClick={() => setAppMode('reservations')}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1 hover:bg-[#2C699F] transition-colors cursor-pointer"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">🔄 Rezerwacje</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Results Section - pełnoekranowa */}
      <div className="w-full bg-[#386BB2] flex flex-col justify-start items-center gap-2.5 p-5">
        {/* Results Header */}
        <div className="w-[344px] h-[50px] bg-[#194576] rounded-tl-[20px] rounded-tr-[20px] rounded-bl-[10px] rounded-br-[10px] flex justify-center items-center">
          <div className="text-white text-[30px] font-normal font-['ADLaM_Display'] underline leading-[42px]">🔍 Wyniki Doboru Nart</div>
        </div>

        {/* Inteligentne sugestie */}
        {suggestions.length > 0 && (
          <div className="w-full bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 rounded mb-2">
            <h3 className="font-bold mb-2 text-sm">💡 Inteligentne sugestie:</h3>
            <ul className="list-disc list-inside space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-xs">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
          {/* Results Container - pełnoekranowy */}
          <div className="w-full min-h-[400px] bg-[#194576] rounded-[20px] flex justify-center items-start gap-2.5 p-2">
            <div className="w-full min-h-[380px] bg-[#A6C2EF] rounded-[20px] p-4 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-white text-xl font-black font-['Inter'] italic">
                    ⏳ Wyszukiwanie nart...
                  </span>
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <span className="text-red-600 text-lg font-black font-['Inter'] italic">
                    ❌ {error}
                  </span>
                  
                  {/* Wyświetl szczegółowe błędy walidacji */}
                  {(formErrors.height || formErrors.weight || formErrors.level || formErrors.gender || 
                    formErrors.dateFrom.day || formErrors.dateTo.day) && (
                    <div className="text-red-400 text-sm font-bold space-y-1">
                      {formErrors.height && <div>• Wzrost: {formErrors.height}</div>}
                      {formErrors.weight && <div>• Waga: {formErrors.weight}</div>}
                      {formErrors.level && <div>• Poziom: {formErrors.level}</div>}
                      {formErrors.gender && <div>• Płeć: {formErrors.gender}</div>}
                      {formErrors.dateFrom.day && <div>• Data od: {formErrors.dateFrom.day}</div>}
                      {formErrors.dateTo.day && <div>• Data do: {formErrors.dateTo.day}</div>}
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !error && !searchResults && (
                <div className="flex items-center justify-center h-full text-center">
                  <span className="text-white text-lg font-black font-['Inter'] italic">
                    👋 Witaj! Wypełnij formularz i kliknij "Wyszukaj" aby znaleźć idealne narty
                  </span>
                </div>
              )}

              {!isLoading && !error && searchResults && (
                <div className="space-y-4">
                  {/* Legenda kolorów dostępności - NOWY SYSTEM 3-KOLOROWY */}
                  {currentCriteria?.dateFrom && currentCriteria?.dateTo && (
                    <div className="bg-[#194576]/50 rounded-lg p-4 border-2 border-[#A6C2EF]">
                      <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                        📅 LEGENDA DOSTĘPNOŚCI:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="inline-block w-5 h-5 bg-green-500 rounded flex-shrink-0 mt-0.5"></span>
                          <div>
                            <span className="text-white font-bold">🟢 Dostępne</span>
                            <p className="text-[#A6C2EF] text-xs">Brak rezerwacji (min. 2 dni na serwis)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-block w-5 h-5 bg-yellow-500 rounded flex-shrink-0 mt-0.5"></span>
                          <div>
                            <span className="text-white font-bold">🟡 Uwaga</span>
                            <p className="text-[#A6C2EF] text-xs">Rezerwacja 1-2 dni przed/po (za mało czasu na serwis)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-block w-5 h-5 bg-red-500 rounded flex-shrink-0 mt-0.5"></span>
                          <div>
                            <span className="text-white font-bold">🔴 Zarezerwowane</span>
                            <p className="text-[#A6C2EF] text-xs">Konflikt z wybraną datą wypożyczenia</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[#A6C2EF] text-xs mt-3 italic">
                        💡 Najedź myszką na kwadracik aby zobaczyć szczegóły rezerwacji
                      </p>
                    </div>
                  )}

                  {searchResults.wszystkie.length === 0 && (
                    <div className="text-center">
                      <span className="text-white text-lg font-black font-['Inter'] italic">
                        😔 Nie znaleziono nart pasujących do Twoich kryteriów
                      </span>
                    </div>
                  )}

                  {groupedResults && groupedResults.idealne.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        🏆 IDEALNE DOPASOWANIE ({groupedResults.idealne.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {groupedResults.idealne.map((match, idx) => (
                          <div key={idx} className="bg-white/20 p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-2 h-12">
                              {/* Lewa strona - badge ze stylem i długość pod nim */}
                              <div className="flex flex-col items-center space-y-1">
                                <SkiStyleBadge 
                                  przeznaczenie={match.ski.PRZEZNACZENIE}
                                  atuty={match.ski.ATUTY}
                                />
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                  {match.ski.DLUGOSC}cm
                                </div>
                              </div>
                              
                              {/* Środek - Nazwa narty */}
                              <div className="text-white font-black text-base text-center flex-1 h-12 flex items-center justify-center">
                                {match.ski.MARKA} {match.ski.MODEL}
                              </div>
                              
                              {/* Prawa strona - procent dopasowania */}
                              <div className="flex flex-col items-center">
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                  <span className={`${
                                    match.compatibility >= 90 ? 'text-green-400' :
                                    match.compatibility >= 70 ? 'text-yellow-400' :
                                    match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {match.compatibility}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DetailedCompatibility 
                              match={match}
                              userCriteria={currentCriteria!}
                              skisDatabase={skisDatabase}
                              isRowExpanded={isCardExpandedInRow('idealne', idx)}
                              onRowToggle={() => toggleCardInRow('idealne')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedResults && groupedResults.alternatywy.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        ⭐ ALTERNATYWY ({groupedResults.alternatywy.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {(expandedCategories.alternatywy ? groupedResults.alternatywy : groupedResults.alternatywy.slice(0, 8)).map((match, idx) => (
                          <div key={idx} className="bg-white/15 p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-2 h-12">
                              {/* Lewa strona - badge ze stylem i długość pod nim */}
                              <div className="flex flex-col items-center space-y-1">
                                <SkiStyleBadge 
                                  przeznaczenie={match.ski.PRZEZNACZENIE}
                                  atuty={match.ski.ATUTY}
                                />
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                  {match.ski.DLUGOSC}cm
                                </div>
                              </div>
                              
                              {/* Środek - Nazwa narty */}
                              <div className="text-white font-black text-base text-center flex-1 h-12 flex items-center justify-center">
                                {match.ski.MARKA} {match.ski.MODEL}
                              </div>
                              
                              {/* Prawa strona - procent dopasowania */}
                              <div className="flex flex-col items-center">
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                  <span className={`${
                                    match.compatibility >= 90 ? 'text-green-400' :
                                    match.compatibility >= 70 ? 'text-yellow-400' :
                                    match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {match.compatibility}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DetailedCompatibility 
                              match={match}
                              userCriteria={currentCriteria!}
                              skisDatabase={skisDatabase}
                              isRowExpanded={isCardExpandedInRow('alternatywy', idx)}
                              onRowToggle={() => toggleCardInRow('alternatywy')}
                            />
                          </div>
                        ))}
                      </div>
                      {groupedResults && groupedResults.alternatywy.length > 8 && (
                        <button
                          onClick={() => toggleCategory('alternatywy')}
                          className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                        >
                          {expandedCategories.alternatywy ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.alternatywy.length - 8})`}
                        </button>
                      )}
                    </div>
                  )}

                  {groupedResults && groupedResults.inna_plec.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        👤 INNA PŁEĆ ({groupedResults.inna_plec.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {(expandedCategories.inna_plec ? groupedResults.inna_plec : groupedResults.inna_plec.slice(0, 8)).map((match, idx) => (
                          <div key={idx} className="bg-blue-500/20 p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-2 h-12">
                              {/* Lewa strona - badge ze stylem i długość pod nim */}
                              <div className="flex flex-col items-center space-y-1">
                                <SkiStyleBadge 
                                  przeznaczenie={match.ski.PRZEZNACZENIE}
                                  atuty={match.ski.ATUTY}
                                />
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                  {match.ski.DLUGOSC}cm
                                </div>
                              </div>
                              
                              {/* Środek - Nazwa narty */}
                              <div className="text-white font-black text-base text-center flex-1 h-12 flex items-center justify-center">
                                {match.ski.MARKA} {match.ski.MODEL}
                              </div>
                              
                              {/* Prawa strona - procent dopasowania */}
                              <div className="flex flex-col items-center">
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                  <span className={`${
                                    match.compatibility >= 90 ? 'text-green-400' :
                                    match.compatibility >= 70 ? 'text-yellow-400' :
                                    match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {match.compatibility}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DetailedCompatibility 
                              match={match}
                              userCriteria={currentCriteria!}
                              skisDatabase={skisDatabase}
                              isRowExpanded={isCardExpandedInRow('inna_plec', idx)}
                              onRowToggle={() => toggleCardInRow('inna_plec')}
                            />
                          </div>
                        ))}
                      </div>
                      {groupedResults && groupedResults.inna_plec.length > 8 && (
                        <button
                          onClick={() => toggleCategory('inna_plec')}
                          className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                        >
                          {expandedCategories.inna_plec ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.inna_plec.length - 8})`}
                        </button>
                      )}
                    </div>
                  )}

                  {groupedResults && groupedResults.poziom_za_nisko.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        📉 POZIOM ZA NISKO ({groupedResults.poziom_za_nisko.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {(expandedCategories.poziom_za_nisko ? groupedResults.poziom_za_nisko : groupedResults.poziom_za_nisko.slice(0, 8)).map((match, idx) => (
                          <div key={idx} className="bg-orange-500/20 p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-2 h-12">
                              {/* Lewa strona - badge ze stylem i długość pod nim */}
                              <div className="flex flex-col items-center space-y-1">
                                <SkiStyleBadge 
                                  przeznaczenie={match.ski.PRZEZNACZENIE}
                                  atuty={match.ski.ATUTY}
                                />
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                  {match.ski.DLUGOSC}cm
                                </div>
                              </div>
                              
                              {/* Środek - Nazwa narty */}
                              <div className="text-white font-black text-base text-center flex-1 h-12 flex items-center justify-center">
                                {match.ski.MARKA} {match.ski.MODEL}
                              </div>
                              
                              {/* Prawa strona - procent dopasowania */}
                              <div className="flex flex-col items-center">
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                  <span className={`${
                                    match.compatibility >= 90 ? 'text-green-400' :
                                    match.compatibility >= 70 ? 'text-yellow-400' :
                                    match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {match.compatibility}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DetailedCompatibility 
                              match={match}
                              userCriteria={currentCriteria!}
                              skisDatabase={skisDatabase}
                              isRowExpanded={isCardExpandedInRow('poziom_za_nisko', idx)}
                              onRowToggle={() => toggleCardInRow('poziom_za_nisko')}
                            />
                          </div>
                        ))}
                      </div>
                      {groupedResults && groupedResults.poziom_za_nisko.length > 8 && (
                        <button
                          onClick={() => toggleCategory('poziom_za_nisko')}
                          className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                        >
                          {expandedCategories.poziom_za_nisko ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.poziom_za_nisko.length - 8})`}
                        </button>
                      )}
                    </div>
                  )}

                  {groupedResults && groupedResults.na_sile.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        💪 NA SIŁĘ ({groupedResults.na_sile.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {(expandedCategories.na_sile ? groupedResults.na_sile : groupedResults.na_sile.slice(0, 8)).map((match, idx) => (
                          <div key={idx} className="bg-red-500/20 p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-2 h-12">
                              {/* Lewa strona - badge ze stylem i długość pod nim */}
                              <div className="flex flex-col items-center space-y-1">
                                <SkiStyleBadge 
                                  przeznaczenie={match.ski.PRZEZNACZENIE}
                                  atuty={match.ski.ATUTY}
                                />
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                  {match.ski.DLUGOSC}cm
                                </div>
                              </div>
                              
                              {/* Środek - Nazwa narty */}
                              <div className="text-white font-black text-base text-center flex-1 h-12 flex items-center justify-center">
                                {match.ski.MARKA} {match.ski.MODEL}
                              </div>
                              
                              {/* Prawa strona - procent dopasowania */}
                              <div className="flex flex-col items-center">
                                <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                  <span className={`${
                                    match.compatibility >= 90 ? 'text-green-400' :
                                    match.compatibility >= 70 ? 'text-yellow-400' :
                                    match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {match.compatibility}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DetailedCompatibility 
                              match={match}
                              userCriteria={currentCriteria!}
                              skisDatabase={skisDatabase}
                              isRowExpanded={isCardExpandedInRow('na_sile', idx)}
                              onRowToggle={() => toggleCardInRow('na_sile')}
                            />
                          </div>
                        ))}
                      </div>
                      {groupedResults && groupedResults.na_sile.length > 8 && (
                        <button
                          onClick={() => toggleCategory('na_sile')}
                          className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                        >
                          {expandedCategories.na_sile ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.na_sile.length - 8})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
      
      {/* Renderowanie komponentu przeglądania */}
      {appMode === 'browse' && (
        <div className="fixed inset-0 bg-[#386BB2] z-50 overflow-auto">
          <BrowseSkisComponent 
            skisDatabase={skisDatabase}
            userCriteria={currentCriteria || {
              wzrost: 170,
              waga: 70,
              poziom: 3,
              plec: 'W'
              // Brak dateFrom i dateTo - wszystkie narty będą zielone
            }}
            onBackToSearch={() => setAppMode('search')}
          />
        </div>
      )}

      {/* Renderowanie widoku rezerwacji */}
      {appMode === 'reservations' && (
        <div className="fixed inset-0 bg-[#386BB2] z-50 overflow-auto">
          <ReservationsView 
            onBackToSearch={() => setAppMode('search')}
          />
        </div>
      )}
    </div>
  );
};

export default AnimaComponent;