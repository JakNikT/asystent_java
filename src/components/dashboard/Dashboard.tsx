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
import { DetailedCompatibility } from '../DetailedCompatibility';
import { SkiStyleBadge } from '../SkiStyleBadge';
import { BrowseSkisComponent } from '../BrowseSkisComponent';
import { ReservationsView } from '../ReservationsView';
import { HistoryView } from '../HistoryView';
import type { SkiData, SearchResults, SearchCriteria, SkiMatch } from '../../types/ski.types';
import type { FormData, TabData, AppMode } from '../../types/dashboard.types';
import PasswordModal from '../PasswordModal';
import { motion, AnimatePresence } from 'framer-motion';
import { formatModelName, formatBrandName } from '../../utils/nameFormatter';
import TabNavigation from './TabNavigation';
import DashboardHeader from './DashboardHeader';
import SkierForm from './SkierForm';
import EmployeeControls from './EmployeeControls';
import { Layout } from '../layout/Layout';

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as const // cubic-bezier dla płynniejszej animacji
    }
  }
};

const Dashboard: React.FC = () => {
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
        gender: '',
        shoeSize: '' // NOWE: pole rozmiaru buta
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

  // NOWY STAN: Tryb aplikacji (wyszukiwanie vs przeglądanie vs rezerwacje vs historia)
  const [appMode, setAppMode] = useState<AppMode>('search');

  // NOWY STAN: Śledzenie, czy użytkownik wybrał już grupę w trybie przeglądania
  const [hasSelectedGroup, setHasSelectedGroup] = useState<boolean>(false);

  // NOWY STAN: Filtry kategorii sprzętu
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');

  // STAN: Tryb pracownika vs klienta (domyślnie klient)
  const [isEmployeeMode, setIsEmployeeMode] = useState<boolean>(false);
  
  // HASŁO: Hardcoded hasło pracownika
  const EMPLOYEE_PASSWORD = "0000";

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

  // FUNKCJE ZARZĄDZANIA KARTAMI
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
        shoeSize: '' // NOWE: pole rozmiaru buta
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
    setActiveTabId(newId); // Przełącz na nową kartę
  };

  const removeTab = (tabId: string) => {
    if (tabs.length === 1) return; // Nie usuwaj ostatniej karty
    
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      // Jeśli usuwamy aktywną kartę, przełącz na pierwszą dostępną
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
  // Narty tego samego modelu mają już licznik wolnych sztuk w DetailedCompatibility
  const groupMatchesByModel = (matches: SkiMatch[]): SkiMatch[] => {
    const grouped = new Map<string, SkiMatch[]>();
    
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

  // Funkcja filtrowania wyników wyszukiwania według typu i kategorii sprzętu
  const filterSearchResults = (results: SearchResults | null): SearchResults | null => {
    if (!results) return null;
    if (!equipmentTypeFilter && !categoryFilter) return results;
    
    console.log('src/components/dashboard/Dashboard.tsx: Filtrowanie wyników - typ:', equipmentTypeFilter, 'kategoria:', categoryFilter);
    
    // Filtruj każdą kategorię wyników
    const filterMatches = (matches: SkiMatch[]) => {
      return matches.filter(match => {
        let typeMatch = true;
        let catMatch = true;
        
        if (equipmentTypeFilter) {
          typeMatch = match.ski.TYP_SPRZETU === equipmentTypeFilter;
        }
        
        if (categoryFilter) {
          // SPECJALNY PRZYPADEK: TOP_VIP pokazuje zarówno TOP jak i VIP
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
    
    console.log('src/components/dashboard/Dashboard.tsx: Wyniki po filtrowaniu:', {
      idealne: filtered.idealne.length,
      alternatywy: filtered.alternatywy.length,
      wszystkie: filtered.wszystkie.length
    });
    
    return filtered;
  };

  // Funkcja automatycznego wyboru pierwszej dostępnej kategorii
  const autoSelectFirstCategory = (results: SearchResults) => {
    console.log('src/components/dashboard/Dashboard.tsx: Automatyczny wybór pierwszej kategorii z wynikami');
    
    // Znajdź pierwszą kategorię z wynikami
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
        
        // SPECJALNY PRZYPADEK: TOP_VIP pokazuje zarówno TOP jak i VIP
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
        console.log(`src/components/dashboard/Dashboard.tsx: Wybrano kategorię ${cat.label} (${filtered.length} wyników)`);
        setEquipmentTypeFilter(cat.type);
        setCategoryFilter(cat.category);
        return;
      }
    }
    
    console.log('src/components/dashboard/Dashboard.tsx: Nie znaleziono żadnej kategorii z wynikami');
  };

  // NOWA FUNKCJA: Wyszukiwanie butów po rozmiarze
  // @ts-expect-error - funkcja zarezerwowana na przyszłość
  const handleShoeSearch = (type: string, category: string, shoeSize: number) => {
    console.log(`src/components/dashboard/Dashboard.tsx: Wyszukiwanie butów - typ: ${type}, kategoria: ${category}, rozmiar: ${shoeSize}`);
    
    try {
      setIsLoading(true);
      setError('');
      
      // Filtruj buty po rozmiarze i typie
      const matchingShoes = skisDatabase.filter(shoe => {
        // Sprawdź typ sprzętu
        if (shoe.TYP_SPRZETU !== type) return false;
        
        // Sprawdź kategorię (jeśli podana)
        if (category && shoe.KATEGORIA !== category) return false;
        
        // Sprawdź rozmiar (DLUGOSC == shoeSize)
        // Tolerancja 0.5 cm żeby uwzględnić różnice w zaokrągleniach
        if (Math.abs(shoe.DLUGOSC - shoeSize) > 0.5) return false;
        
        return true;
      });
      
      console.log(`src/components/dashboard/Dashboard.tsx: Znaleziono ${matchingShoes.length} butów`);
      
      if (matchingShoes.length === 0) {
        setError(`Nie znaleziono butów w rozmiarze ${shoeSize} cm`);
        setSearchResults(null);
        return;
      }
      
      // Utwórz wyniki jako SkiMatch (wszystkie buty jako "idealne")
      const shoeMatches: SkiMatch[] = matchingShoes.map(shoe => ({
        ski: shoe,
        compatibility: 100, // Dopasowanie 100% dla dokładnego rozmiaru
        dopasowanie: {
          poziom: '✓ Rozmiar pasuje',
          plec: '',
          waga: '',
          wzrost: '',
          przeznaczenie: ''
        },
        kategoria: 'idealne' as const,
        zielone_punkty: 5
      }));
      
      // Utwórz strukturę SearchResults
      const results: SearchResults = {
        idealne: shoeMatches,
        alternatywy: [],
        poziom_za_nisko: [],
        inna_plec: [],
        na_sile: [],
        wszystkie: shoeMatches
      };
      
      setSearchResults(results);
      
      // ZMIENIONE: Zamiast null, zachowaj daty z formularza dla sprawdzania dostępności
      const dateFrom = parseDate(formData.dateFrom);
      const dateTo = parseDate(formData.dateTo);
      
      // Utwórz minimalne kryteria z datami (dla sprawdzania dostępności w "Przeglądaj")
      setCurrentCriteria({
        wzrost: 170, // Domyślne wartości (nieużywane dla butów)
        waga: 70,
        poziom: 3,
        plec: 'W',
        dateFrom: dateFrom, // WAŻNE: Zachowaj daty!
        dateTo: dateTo
      });
      
      // Ustaw filtry do wyświetlania
      setEquipmentTypeFilter(type);
      setCategoryFilter(category);
      
      console.log(`src/components/dashboard/Dashboard.tsx: Wyświetlono ${matchingShoes.length} butów`);
    } catch (err) {
      console.error('src/components/dashboard/Dashboard.tsx: Błąd wyszukiwania butów:', err);
      setError('Wystąpił błąd podczas wyszukiwania butów');
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja obsługi szybkich filtrów - NOWA LOGIKA: Przyciski otwierają widok "Przeglądaj" z filtrem
  const handleQuickFilterInSearch = (type: string, category: string) => {
    console.log(`src/components/dashboard/Dashboard.tsx: Otwieranie przeglądania - typ: ${type}, kategoria: ${category}`);
    
    // Wyczyść wybrane style aby nie filtrowały wyników
    setSelectedStyles([]);
    
    // Ustaw filtry i otwórz widok "Przeglądaj" jednocześnie
    // React batchuje aktualizacje state, więc wszystkie będą zastosowane przed renderowaniem
    setEquipmentTypeFilter(type);
    setCategoryFilter(category);
    handleBrowseMode(true); // Użytkownik już wybrał grupę
    
    console.log(`src/components/dashboard/Dashboard.tsx: Filtry ustawione - typ: ${type}, kategoria: ${category}, otwieram "Przeglądaj"`);
  };

  // USUNIĘTO: clearEquipmentFilters - nie jest już potrzebna (brak przycisku "Wszystkie")

  // Funkcja do parsowania daty z formularza (obsługuje 2-cyfrowy rok)
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
    
    // Konwertuj 2-cyfrowy rok na pełny format (24 → 2024, 25 → 2025, itd.)
    if (year >= 24 && year <= 30) {
      year = 2000 + year;
    } else if (year < 24 || year > 2030) {
      // Nieprawidłowy rok
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

  // NOWY: Wczytaj karty z LocalStorage przy starcie
  useEffect(() => {
    console.log('src/components/dashboard/Dashboard.tsx: Wczytuję karty z LocalStorage przy starcie aplikacji');
    const savedTabs = loadAllTabs();
    
    if (savedTabs && savedTabs.tabs.length > 0) {
      console.log('src/components/dashboard/Dashboard.tsx: Znaleziono zapisane karty:', savedTabs);
      
      // Odtwórz karty z domyślnymi wartościami dla pól, które nie są zapisywane
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
      console.log('src/components/dashboard/Dashboard.tsx: Karty przywrócone z LocalStorage');
    } else {
      console.log('src/components/dashboard/Dashboard.tsx: Brak zapisanych kart, używam domyślnych');
    }
  }, []);

  // NOWY: Automatycznie zapisuj karty do LocalStorage przy każdej zmianie
  useEffect(() => {
    if (tabs.length > 0) {
      console.log('src/components/dashboard/Dashboard.tsx: Auto-zapisywanie kart do LocalStorage');
      saveAllTabs(tabs, activeTabId);
    }
  }, [tabs, activeTabId]);

  // Refs dla automatycznego przechodzenia między polami
  const dayFromRef = React.useRef<HTMLInputElement>(null);
  const monthFromRef = React.useRef<HTMLInputElement>(null);
  const dayToRef = React.useRef<HTMLInputElement>(null);
  const monthToRef = React.useRef<HTMLInputElement>(null);
  const heightRef = React.useRef<HTMLInputElement>(null);
  const weightRef = React.useRef<HTMLInputElement>(null);
  const levelRef = React.useRef<HTMLInputElement>(null);
  const genderRef = React.useRef<HTMLInputElement>(null);
  const shoeSizeRef = React.useRef<HTMLInputElement>(null); // NOWE: ref dla pola rozmiaru buta

  // NOWA FUNKCJA: Ładowanie bazy danych (może być wywołana wielokrotnie)
  const loadDatabase = async () => {
    try {
      console.log('src/components/dashboard/Dashboard.tsx: Ładuję bazę danych nart...');
      
      // Sprawdź czy serwer API jest dostępny
      const isServerAvailable = await SkiDataService.checkServerHealth();
      
      let skis: SkiData[];
      if (isServerAvailable) {
        // Ładuj z API (zawsze aktualne dane!)
        console.log('src/components/dashboard/Dashboard.tsx: Ładuję dane z API serwera');
        skis = await SkiDataService.getAllSkis();
      } else {
        // Fallback do statycznego CSV (gdy serwer nie działa)
        console.log('src/components/dashboard/Dashboard.tsx: Serwer niedostępny - ładuję ze statycznego CSV');
        skis = await CSVParser.loadFromPublic();
      }
      
      setSkisDatabase(skis);
      console.log(`src/components/dashboard/Dashboard.tsx: Załadowano ${skis.length} nart z bazy danych`);
    } catch (err) {
      console.error('src/components/dashboard/Dashboard.tsx: Błąd ładowania bazy:', err);
      setError('Nie udało się załadować bazy danych nart');
    }
  };

  // Ładowanie bazy danych przy starcie
  useEffect(() => {
    loadDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOWY: Automatyczne wyszukiwanie gdy wszystkie pola są wypełnione
  const autoSearchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Pomiń pierwsze renderowanie (gdy aplikacja się ładuje)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Wyczyść poprzedni timer
    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
    }

    console.log('src/components/dashboard/Dashboard.tsx: Zmiana w formData - sprawdzam czy uruchomić automatyczne wyszukiwanie');

    // Sprawdź czy wszystkie wymagane pola są wypełnione
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

    console.log('src/components/dashboard/Dashboard.tsx: Formularz kompletny:', isFormComplete);

    if (isFormComplete) {
      // Waliduj formularz
      const validation = validateForm(formData);
      
      if (validation.isValid) {
        console.log('src/components/dashboard/Dashboard.tsx: Formularz wypełniony i poprawny - uruchamiam automatyczne wyszukiwanie za 500ms');
        
        // Odczekaj 500ms przed wyszukiwaniem (debounce)
        autoSearchTimerRef.current = setTimeout(() => {
          console.log('src/components/dashboard/Dashboard.tsx: Uruchamiam automatyczne wyszukiwanie');
          handleSubmit(formData);
        }, 500);
      } else {
        console.log('src/components/dashboard/Dashboard.tsx: Formularz wypełniony ale zawiera błędy - nie uruchamiam wyszukiwania');
      }
    } else {
      console.log('src/components/dashboard/Dashboard.tsx: Formularz niekompletny - nie uruchamiam automatycznego wyszukiwania');
    }

    // Cleanup timer przy odmontowywaniu
    return () => {
      if (autoSearchTimerRef.current) {
        clearTimeout(autoSearchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, selectedStyles, activeTabId, skisDatabase.length]); // Reaguj na zmiany w formData, wybranych stylach, aktywnej karcie i gdy baza się załaduje

  // Funkcja pomocnicza do zaznaczania całego tekstu przy kliknięciu
  const handleDateFieldClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.value) {
      input.select();
    }
  };

  // Funkcja pomocnicza do focusowania i zaznaczania tekstu w polu (jeśli ma wartość)
  const focusAndSelectIfValue = (input: HTMLInputElement | null) => {
    if (input) {
      input.focus();
      // Użyj setTimeout aby upewnić się, że focus się wykonał przed select
      setTimeout(() => {
        if (input.value) {
          input.select();
        }
      }, 0);
    }
  };

  // src/components/dashboard/Dashboard.tsx: Funkcja obsługi zmian kryteriów z BrowseSkisComponent
  // src/components/dashboard/Dashboard.tsx: Obsługa zmiany daty z BrowseSkisComponent
  const handleDateChange = (
    section: 'dateFrom' | 'dateTo',
    field: 'day' | 'month' | 'year',
    value: string,
    inputRef?: HTMLInputElement
  ) => {
    console.log(`src/components/dashboard/Dashboard.tsx: Zmiana daty z BrowseSkisComponent - sekcja: ${section}, pole: ${field}, wartość: "${value}"`);
    // Użyj istniejącej funkcji handleInputChange, która aktualizuje formData i formErrors
    handleInputChange(section, field, value, inputRef);
  };

  const handleBrowseCriteriaChange = (criteria: Partial<SearchCriteria>) => {
    console.log('Dashboard: Otrzymano zmienione kryteria z BrowseSkisComponent:', criteria);
    
    // Konwertuj Partial<SearchCriteria> na format FormData i zaktualizuj activeTab.formData
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
    
    console.log('Dashboard: Zaktualizowano formData z kryteriów BrowseSkisComponent');
  };

  const handleInputChange = (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => {
    console.log(`src/components/dashboard/Dashboard.tsx: Zmiana pola - sekcja: ${section}, pole: ${field}, wartość: "${value}"`);
    console.log(`src/components/dashboard/Dashboard.tsx: Typ sekcji: ${typeof section}, wartość sekcji: "${section}"`);
    
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
      console.log(`src/components/dashboard/Dashboard.tsx: Walidacja wzrostu - wartość: ${value}, isValid: ${isValid}`);
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

    // Jeśli walidacja nie przeszła, nie aktualizuj wartości
    if (!isValid) {
      console.log(`src/components/dashboard/Dashboard.tsx: Walidacja nie przeszła - ${errorMessage}`);
      return;
    }

    console.log(`src/components/dashboard/Dashboard.tsx: Walidacja przeszła, aktualizuję dane`);

    // Aktualizuj dane formularza (bez formatowania)
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
      console.log(`src/components/dashboard/Dashboard.tsx: Aktualizuję ${section} na wartość: ${value}`);
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
    console.log(`src/components/dashboard/Dashboard.tsx: Sprawdzanie automatycznego przechodzenia - sekcja: ${section}, pole: ${field}, wartość: "${value}", długość: ${value.length}`);
    
    if (inputRef) {
      // Dzień "od" → Miesiąc "od"
      if (section === 'dateFrom' && field === 'day' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do miesiąca "od"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      }
      // Miesiąc "od" → Rok "od"
      else if (section === 'dateFrom' && field === 'month' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do roku "od"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="YY"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      }
      // Rok "od" → Dzień "do"
      else if (section === 'dateFrom' && field === 'year' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do dnia "do"`);
        focusAndSelectIfValue(dayToRef.current);
      }
      // Dzień "do" → Miesiąc "do"
      else if (section === 'dateTo' && field === 'day' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do miesiąca "do"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="MM"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      }
      // Miesiąc "do" → Rok "do"
      else if (section === 'dateTo' && field === 'month' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do roku "do"`);
        const nextInput = inputRef.parentElement?.querySelector('input[placeholder="YY"]') as HTMLInputElement;
        focusAndSelectIfValue(nextInput);
      }
      // Rok "do" → Wzrost
      else if (section === 'dateTo' && field === 'year' && value.length === 2) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do wzrostu`);
        focusAndSelectIfValue(heightRef.current);
      }
      // Wzrost → Waga (po 3 cyfrach lub gdy wartość >= 100)
      else if (section === 'height' && field === 'value') {
        const heightNum = parseInt(value);
        console.log(`src/components/dashboard/Dashboard.tsx: Sprawdzanie wzrostu - wartość: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
        console.log(`src/components/dashboard/Dashboard.tsx: Warunek 1 (długość >= 3): ${value.length >= 3}`);
        console.log(`src/components/dashboard/Dashboard.tsx: Warunek 2 (długość >= 2 && liczba >= 100): ${value.length >= 2 && heightNum >= 100}`);
        
        if (value.length >= 3 || (value.length >= 2 && heightNum >= 100)) {
          console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do wagi - wzrost: ${value}, długość: ${value.length}, liczba: ${heightNum}`);
          const nextInput = weightRef.current;
          if (nextInput) {
            console.log(`src/components/dashboard/Dashboard.tsx: Znaleziono pole wagi, przechodzę`);
            focusAndSelectIfValue(nextInput);
          } else {
            console.log(`src/components/dashboard/Dashboard.tsx: Nie znaleziono pola wagi`);
          }
        } else {
          console.log(`src/components/dashboard/Dashboard.tsx: Warunek nie spełniony - nie przechodzę`);
        }
      }
      // Waga → Poziom (po 2 cyfrach lub 3 cyfrach jeśli zaczyna się na 1 lub 2)
      else if (section === 'weight' && field === 'value') {
        if (value.length === 2 && !value.startsWith('1') && !value.startsWith('2')) {
          console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do poziomu - waga: ${value} (2 cyfry, nie zaczyna się na 1/2)`);
          focusAndSelectIfValue(levelRef.current);
        } else if (value.length === 3 && (value.startsWith('1') || value.startsWith('2'))) {
          console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do poziomu - waga: ${value} (3 cyfry, zaczyna się na 1/2)`);
          focusAndSelectIfValue(levelRef.current);
        }
      }
      // Poziom → Płeć (po 1 cyfrze)
      else if (section === 'level' && value.length >= 1) {
        console.log(`src/components/dashboard/Dashboard.tsx: Przechodzenie do płci - poziom: ${value}`);
        focusAndSelectIfValue(genderRef.current);
      }
      // USUNIĘTO: Stare automatyczne wyszukiwanie po wpisaniu płci
      // Teraz używamy globalnego useEffect który automatycznie wyszukuje gdy formularz jest kompletny
    }
  };

  // USUNIĘTO: handlePreferenceChange - teraz używamy handleStyleToggle

  /**
   * Obsługuje zmianę stylu (SINGLE SELECT - tylko jeden na raz)
   */
  const handleStyleToggle = (style: string) => {
    // SINGLE SELECT: Kliknięcie tego samego stylu = odznacz (pusta tablica)
    // Kliknięcie innego stylu = tylko ten jeden
    const newStyles = selectedStyles.includes(style) ? [] : [style];
    
    console.log(`src/components/dashboard/Dashboard.tsx: Wybrano styl ${style}, nowe style:`, newStyles);
    setSelectedStyles(newStyles);
    
    // Automatyczne wyszukiwanie po KAŻDEJ zmianie filtrów (jeśli są już wyniki)
    if (searchResults) {
      setTimeout(() => {
        console.log(`src/components/dashboard/Dashboard.tsx: Automatyczne wyszukiwanie po przełączeniu filtra`);
        handleSubmitWithStyles(newStyles);
      }, 100);
    }
  };

  /**
   * Wyszukuje narty z określonymi stylami (dla automatycznego wyszukiwania po zmianie filtrów)
   */
  const handleSubmitWithStyles = (styles: string[]) => {
    console.log('src/components/dashboard/Dashboard.tsx: Wyszukiwanie z stylami:', styles);
    
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

      console.log('src/components/dashboard/Dashboard.tsx: Kryteria wyszukiwania z stylami:', criteria);

      // Zapisz kryteria dla MatchIndicators
      setCurrentCriteria(criteria);

      // Wyszukaj pasujące narty
      const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      // Sortuj wyniki według dostępności i dopasowania
      const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
      setSearchResults(sortedResults);

      console.log('src/components/dashboard/Dashboard.tsx: Zaktualizowano wyniki z stylami:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('src/components/dashboard/Dashboard.tsx: Błąd wyszukiwania z stylami:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (customFormData?: FormData) => {
    const dataToValidate = customFormData || formData;
    console.log('src/components/dashboard/Dashboard.tsx: Rozpoczęcie walidacji formularza');
    console.log('src/components/dashboard/Dashboard.tsx: Aktualne dane formularza:', dataToValidate);
    
    // Wyczyść poprzednie błędy
    setFormErrors(initialFormErrors);
    setError('');

    // Waliduj formularz
    const validation = validateForm(dataToValidate);
    
    if (!validation.isValid) {
      console.log('src/components/dashboard/Dashboard.tsx: Formularz zawiera błędy walidacji');
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

      console.log('src/components/dashboard/Dashboard.tsx: Kryteria wyszukiwania:', criteria);

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

      // Automatycznie wybierz pierwszą dostępną kategorię TYLKO jeśli użytkownik nie wybrał już kategorii
      // (czyli jeśli equipmentTypeFilter i categoryFilter są puste)
      if (!equipmentTypeFilter && !categoryFilter) {
        console.log('src/components/dashboard/Dashboard.tsx: Automatyczny wybór kategorii (brak filtrów)');
        autoSelectFirstCategory(sortedResults);
      } else {
        console.log('src/components/dashboard/Dashboard.tsx: Pomijam automatyczny wybór - użytkownik wybrał filtry:', equipmentTypeFilter, categoryFilter);
      }

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

      console.log('src/components/dashboard/Dashboard.tsx: Znaleziono wyników:', {
        idealne: results.idealne.length,
        alternatywy: results.alternatywy.length,
        poziom_za_nisko: results.poziom_za_nisko.length,
        inna_plec: results.inna_plec.length,
        na_sile: results.na_sile.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('src/components/dashboard/Dashboard.tsx: Błąd wyszukiwania:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  // USUNIĘTO: handleSubmitClick - nie jest już potrzebna (brak przycisku "Wyszukaj")

  const handleClear = () => {
    console.log('src/components/dashboard/Dashboard.tsx: Czyszczenie formularza aktywnej karty');
    const defaultData = {
      dateFrom: { day: '', month: '', year: '' },
      dateTo: { day: '', month: '', year: '' },
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' },
      level: '',
      gender: '',
      shoeSize: '' // NOWE: pole rozmiaru buta
    };
    
    // Wyczyść tylko aktywną kartę
    updateActiveTab({
      formData: defaultData,
      selectedStyles: [],
      searchResults: null,
      error: '',
      formErrors: initialFormErrors,
      currentCriteria: null
    });
    
    // Reset filtrów kategorii
    setEquipmentTypeFilter('');
    setCategoryFilter('');
    
    console.log('src/components/dashboard/Dashboard.tsx: Aktywna karta wyczyszczona');
  };

  // Grupowanie wyników po modelu (jedna karta na model nart)
  // Narty tego samego modelu mają już licznik wolnych sztuk w DetailedCompatibility
  // ZMIENIONE: Najpierw filtruj według kategorii sprzętu, potem grupuj
  const filteredSearchResults = filterSearchResults(searchResults);
  const groupedResults = filteredSearchResults ? {
    idealne: groupMatchesByModel(filteredSearchResults.idealne),
    alternatywy: groupMatchesByModel(filteredSearchResults.alternatywy),
    poziom_za_nisko: groupMatchesByModel(filteredSearchResults.poziom_za_nisko),
    inna_plec: groupMatchesByModel(filteredSearchResults.inna_plec),
    na_sile: groupMatchesByModel(filteredSearchResults.na_sile)
  } : null;

  const handlePasswordSubmit = (password: string) => {
    console.log('src/components/dashboard/Dashboard.tsx: Weryfikacja hasła pracownika');
    if (password === EMPLOYEE_PASSWORD) {
      console.log('src/components/dashboard/Dashboard.tsx: Hasło poprawne - przełączanie na tryb pracownika');
      setIsEmployeeMode(true);
      setIsPasswordModalOpen(false);
      setPasswordError(''); // Wyczyść błąd przy poprawnym haśle
    } else {
      console.log('src/components/dashboard/Dashboard.tsx: Hasło błędne - pozostanie w trybie klienta');
      setPasswordError('Nieprawidłowe hasło. Spróbuj ponownie.');
    }
  };

  // Funkcja obsługująca przełączanie trybu pracownika (logowanie/wylogowanie)
  const handleToggleEmployeeMode = () => {
    if (isEmployeeMode) {
      // Wyloguj - przełącz na tryb klienta
      console.log('src/components/dashboard/Dashboard.tsx: Wylogowanie - przełączanie na tryb klienta');
      setIsEmployeeMode(false);
      // Jeśli jesteśmy w widoku rezerwacji, wróć do wyszukiwania
      if (appMode === 'reservations') {
        setAppMode('search');
      }
    } else {
      // Zaloguj - otwórz modal z hasłem
      setIsPasswordModalOpen(true);
      setPasswordError(''); // Wyczyść błąd przy otwieraniu modala
    }
  };

  // Funkcja pomocnicza do przełączania trybu przeglądania
  const handleBrowseMode = (hasGroup: boolean = false) => {
    setHasSelectedGroup(hasGroup);
    setAppMode('browse');
  };

  // Funkcja pomocnicza do powrotu do trybu wyszukiwania
  const handleBackToSearch = () => {
    setHasSelectedGroup(false);
    setAppMode('search');
  };

  // Funkcja obsługująca przycisk "Cały sprzęt"
  const handleShowAllEquipment = () => {
    console.log('src/components/dashboard/Dashboard.tsx: Przycisk Cały sprzęt - otwieranie Browse bez filtrów');
    setEquipmentTypeFilter('');
    setCategoryFilter('');
    handleBrowseMode(false);
  };

  // Oblicz initialFilter używając useMemo dla aktualnych wartości filtrów
  const computedInitialFilter = useMemo(() => {
    // Logika mapowania filtrów ze strony głównej do BrowseSkisComponent
    console.log(`src/components/dashboard/Dashboard.tsx: Obliczanie initialFilter - equipmentTypeFilter: ${equipmentTypeFilter}, categoryFilter: ${categoryFilter}`);
    
    if (equipmentTypeFilter === 'DESKI') {
      console.log('src/components/dashboard/Dashboard.tsx: initialFilter = DESKI');
      return 'DESKI';
    }
    if (equipmentTypeFilter === 'BUTY_SNOWBOARD') {
      console.log('src/components/dashboard/Dashboard.tsx: initialFilter = BUTY_SNOWBOARD');
      return 'BUTY_SNOWBOARD';
    }
    if (equipmentTypeFilter === 'BUTY' && categoryFilter === 'JUNIOR') {
      console.log('src/components/dashboard/Dashboard.tsx: initialFilter = BUTY_JUNIOR');
      return 'BUTY_JUNIOR';
    }
    if (equipmentTypeFilter === 'BUTY' && categoryFilter === 'DOROSLE') {
      console.log('src/components/dashboard/Dashboard.tsx: initialFilter = DOROSLE');
      return 'DOROSLE';
    }
    if (equipmentTypeFilter === 'NARTY' && categoryFilter) {
      console.log(`src/components/dashboard/Dashboard.tsx: initialFilter = ${categoryFilter} (NARTY)`);
      return categoryFilter; // TOP, VIP, JUNIOR
    }
    console.log('src/components/dashboard/Dashboard.tsx: initialFilter = all (domyślny)');
    return 'all';
  }, [equipmentTypeFilter, categoryFilter]);

  // NOWA FUNKCJA: Aktualizacja stanu pól wyszukiwania dla aktywnej karty
  const handleFilterSearchChange = (filterKey: any, field: 'searchTerm' | 'searchFlex' | 'searchDlugosc', value: string) => {
    console.log(`Dashboard: Aktualizuję stan wyszukiwania dla filtra ${filterKey}, pole: ${field}, wartość: ${value}`);
    
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

  return (
    <Layout
      navigation={
        /* Tabs Navigation - System kart responsywny, scrollowalny poziomo na mobile - tylko w trybie przeglądaj */
        appMode === 'browse' ? (
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onAddTab={addNewTab}
            onRemoveTab={removeTab}
            isEmployeeMode={isEmployeeMode}
            onToggleEmployeeMode={handleToggleEmployeeMode}
            appMode={appMode}
          />
        ) : null
      }
      header={
        /* Header Section - responsywne - NOWY LAYOUT: Logo ponad formularzem */
        <DashboardHeader
          equipmentTypeFilter={equipmentTypeFilter}
          categoryFilter={categoryFilter}
          appMode={appMode}
          onQuickFilter={handleQuickFilterInSearch}
          onShowAllEquipment={handleShowAllEquipment}
        >
          <SkierForm
            formData={formData}
            formErrors={formErrors}
            onFieldChange={handleInputChange as (section: keyof FormData | string, field: string, value: string, el?: HTMLInputElement) => void}
            handleDateFieldClick={handleDateFieldClick}
            dayFromRef={dayFromRef}
            monthFromRef={monthFromRef}
            dayToRef={dayToRef}
            monthToRef={monthToRef}
            heightRef={heightRef}
            weightRef={weightRef}
            levelRef={levelRef}
            genderRef={genderRef}
            shoeSizeRef={shoeSizeRef}
          />
          <EmployeeControls
            isEmployeeMode={isEmployeeMode}
            appMode={appMode}
            onClear={handleClear}
            onBrowse={() => handleBrowseMode(false)}
            onHistory={() => setAppMode('history')}
            onReservations={() => setAppMode('reservations')}
          />
        </DashboardHeader>
      }
    >
        {/* Results Section - responsywna */}
        {/* WYŁĄCZONE: Inteligentne sugestie i Results Container z kartami nart */}
        {/* Kod został wyłączony - w nowym systemie wyniki są wyświetlane tylko w widoku "Przeglądaj" (BrowseSkisComponent) */}
        {/* Użyj przycisku "Przeglądaj" aby zobaczyć wszystkie narty z filtrowaniem */}
        
        {false && (
          <>
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
            <motion.div 
              className="w-full min-h-[400px] bg-[#194576] rounded-[20px] flex justify-center items-start gap-2.5 p-2"
              animate={{ maxWidth: (searchResults?.wszystkie?.length ?? 0) > 0 ? '100%' : '900px' }}
              transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            >              <div className="w-full min-h-[380px] bg-[#A6C2EF] rounded-[20px] p-4 overflow-y-auto">
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
                  <div className="flex items-center justify-center h-full text-center px-4">
                    <span className="text-white text-lg font-black font-['Inter'] italic">
                      👋 Witaj! Wypełnij formularz i wybierz kategorię sprzętu poniżej 👇
                    </span>
                  </div>
                )}

                {!isLoading && !error && searchResults && (
                  <div className="space-y-4">
                    {searchResults && searchResults!.wszystkie.length === 0 && (
                      <div className="text-center">
                        <span className="text-white text-lg font-black font-['Inter'] italic">
                          😔 Nie znaleziono nart pasujących do Twoich kryteriów
                        </span>
                      </div>
                    )}

                    {groupedResults && groupedResults!.idealne.length > 0 && (
                      <div>
                        {/* Style jazdy - tylko dla poziomu 4+ */}
                        {parseInt(formData.level) >= 4 && equipmentTypeFilter === 'NARTY' && (
                          <div className="w-full bg-[#194576]/50 rounded-lg p-3 mb-3">
                            <div className="flex flex-wrap gap-2 justify-center items-center">
                              {[
                                { id: 'SL', label: '🎿 Slalom', emoji: 'SL' },
                                { id: 'G', label: '⛷️ Gigant', emoji: 'G' },
                                { id: 'SLG', label: '🎯 Pomiędzy', emoji: 'SLG' },
                                { id: 'OFF', label: '🏔️ Poza trasę', emoji: 'OFF' }
                              ].map((style) => (
                                <label 
                                  key={style.id} 
                                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                    selectedStyles.includes(style.id)
                                      ? 'bg-green-500 text-white shadow-lg'
                                      : 'bg-[#2C699F] text-white hover:bg-[#386BB2]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStyles.includes(style.id)}
                                    onChange={() => handleStyleToggle(style.id)}
                                    className="hidden"
                                  />
                                  {style.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                          🏆 IDEALNE DOPASOWANIE ({groupedResults!.idealne.length})
                        </h3>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <AnimatePresence>
                            {groupedResults!.idealne.map((match, idx) => (
                              <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-white/20 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
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
                                  
                                  {/* Środek - Nazwa narty i kod */}
                                  <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                                    <div className="font-black text-base">
                                      {formatBrandName(match.ski)} {formatModelName(match.ski)}
                                    </div>
                                    <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                      KOD: {match.ski.KOD}
                                    </div>
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
                                  isEmployeeMode={isEmployeeMode}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    )}

                    {groupedResults && groupedResults!.alternatywy.length > 0 && (
                      <div>
                        <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                          ⭐ ALTERNATYWY ({groupedResults!.alternatywy.length})
                        </h3>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <AnimatePresence>
                            {(expandedCategories.alternatywy ? groupedResults!.alternatywy : groupedResults!.alternatywy.slice(0, 8)).map((match, idx) => (
                              <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-white/15 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
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
                                  
                                  {/* Środek - Nazwa narty i kod */}
                                  <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                                    <div className="font-black text-base">
                                      {formatBrandName(match.ski)} {formatModelName(match.ski)}
                                    </div>
                                    <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                      KOD: {match.ski.KOD}
                                    </div>
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
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                        {groupedResults && groupedResults!.alternatywy.length > 8 && (
                          <button
                            onClick={() => toggleCategory('alternatywy')}
                            className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                          >
                            {expandedCategories.alternatywy ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults!.alternatywy.length - 8})`}
                          </button>
                        )}
                      </div>
                    )}

                    {groupedResults && groupedResults!.inna_plec.length > 0 && (
                      <div>
                        <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                          👤 INNA PŁEĆ ({groupedResults!.inna_plec.length})
                        </h3>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <AnimatePresence>
                            {(expandedCategories.inna_plec ? groupedResults!.inna_plec : groupedResults!.inna_plec.slice(0, 8)).map((match, idx) => (
                              <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-blue-500/20 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
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
                                  
                                  {/* Środek - Nazwa narty i kod */}
                                  <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                                    <div className="font-black text-base">
                                      {formatBrandName(match.ski)} {formatModelName(match.ski)}
                                    </div>
                                    <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                      KOD: {match.ski.KOD}
                                    </div>
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
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                        {groupedResults && groupedResults!.inna_plec.length > 8 && (
                          <button
                            onClick={() => toggleCategory('inna_plec')}
                            className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                          >
                            {expandedCategories.inna_plec ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults!.inna_plec.length - 8})`}
                          </button>
                        )}
                      </div>
                    )}

                    {groupedResults && groupedResults!.poziom_za_nisko.length > 0 && (
                      <div>
                        <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                          📉 POZIOM ZA NISKO ({groupedResults!.poziom_za_nisko.length})
                        </h3>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <AnimatePresence>
                            {(expandedCategories.poziom_za_nisko ? groupedResults!.poziom_za_nisko : groupedResults!.poziom_za_nisko.slice(0, 8)).map((match, idx) => (
                              <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-orange-500/20 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
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
                                  
                                  {/* Środek - Nazwa narty i kod */}
                                  <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                                    <div className="font-black text-base">
                                      {formatBrandName(match.ski)} {formatModelName(match.ski)}
                                    </div>
                                    <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                      KOD: {match.ski.KOD}
                                    </div>
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
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                        {groupedResults && groupedResults!.poziom_za_nisko.length > 8 && (
                          <button
                            onClick={() => toggleCategory('poziom_za_nisko')}
                            className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                          >
                            {expandedCategories.poziom_za_nisko ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults!.poziom_za_nisko.length - 8})`}
                          </button>
                        )}
                      </div>
                    )}

                    {groupedResults && groupedResults!.na_sile.length > 0 && (
                      <div>
                        <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                          💪 NA SIŁĘ ({groupedResults!.na_sile.length})
                        </h3>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <AnimatePresence>
                            {(expandedCategories.na_sile ? groupedResults!.na_sile : groupedResults!.na_sile.slice(0, 8)).map((match, idx) => (
                              <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-red-500/20 p-3 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
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
                                  
                                  {/* Środek - Nazwa narty i kod */}
                                  <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                                    <div className="font-black text-base">
                                      {formatBrandName(match.ski)} {formatModelName(match.ski)}
                                    </div>
                                    <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                      KOD: {match.ski.KOD}
                                    </div>
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
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                        {groupedResults && groupedResults!.na_sile.length > 8 && (
                          <button
                            onClick={() => toggleCategory('na_sile')}
                            className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                          >
                            {expandedCategories.na_sile ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults!.na_sile.length - 8})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      
      {/* Renderowanie komponentu przeglądania */}
      {appMode === 'browse' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <BrowseSkisComponent
            allSkis={skisDatabase}
            browseCriteria={{
              wzrost: formData.height.value ? parseInt(formData.height.value) : undefined,
              waga: formData.weight.value ? parseInt(formData.weight.value) : undefined,
              poziom: formData.level ? parseInt(formData.level) : undefined,
              plec: formData.gender ? (formData.gender.toUpperCase() as 'M' | 'K' | 'W') : undefined,
              dateFrom: parseDate(formData.dateFrom),
              dateTo: parseDate(formData.dateTo)
            }}
            onBack={handleBackToSearch}
            initialFilter={computedInitialFilter}
            tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
            activeTabId={activeTabId}
            onTabChange={(tabId) => setActiveTabId(tabId)}
            onAddTab={addNewTab}
            onRemoveTab={removeTab}
            onRefreshData={loadDatabase}
            isEmployeeMode={isEmployeeMode}
            onCriteriaChange={handleBrowseCriteriaChange}
            onFilterSearchChange={handleFilterSearchChange}
            filterSearchStates={activeTab.filterSearchStates}
            hasSelectedGroup={hasSelectedGroup}
            onGroupSelected={() => setHasSelectedGroup(true)}
            formData={formData}
            formErrors={formErrors}
            onDateChange={handleDateChange}
          />
        </div>
      )}

      {/* Renderowanie widoku rezerwacji */}
      {appMode === 'reservations' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <ReservationsView 
            onBackToSearch={() => setAppMode('search')}
          />
        </div>
      )}

      {/* Renderowanie widoku historii */}
      {appMode === 'history' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <HistoryView 
            onBack={() => setAppMode('search')}
          />
        </div>
      )}

      {/* Renderowanie modala hasła */}
      {isPasswordModalOpen && (
        <PasswordModal
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPasswordError(''); // Wyczyść błąd przy zamykaniu
          }}
          onSubmit={handlePasswordSubmit}
          errorMessage={passwordError}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
