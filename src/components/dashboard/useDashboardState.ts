/**
 * src/components/dashboard/useDashboardState.ts: Hook zarządzający stanem Dashboard
 * REFACTORED: Podział na mniejsze hooki dla lepszej czytelności i utrzymania
 */

import { useState } from 'react';
import type { SkiData, SearchResults, SearchCriteria, SkiMatch } from '../../types/ski.types';
import type { FormData, TabData, AppMode, FilterKey } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';
import { loadAppState } from '../../utils/localStorage';

// Hooks
import { useSkiData } from './hooks/useSkiData';
import { useTabsState } from './hooks/useTabsState';
import { useEmployeeAuth } from './hooks/useEmployeeAuth';
import { useFormLogic } from './hooks/useFormLogic';
import { useSearchLogic } from './hooks/useSearchLogic';

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
  handleDateChange: (section: 'dateFrom' | 'dateTo', value: string) => void;
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
  parseDate: (dateStr: string) => Date | undefined;

  // Refs
  heightRef: React.RefObject<HTMLInputElement | null>;
  weightRef: React.RefObject<HTMLInputElement | null>;
  levelRef: React.RefObject<HTMLInputElement | null>;
  genderRef: React.RefObject<HTMLInputElement | null>;
  shoeSizeRef: React.RefObject<HTMLInputElement | null>;
}

export const useDashboardState = (): DashboardStateReturn => {
  // 1. Ski Data
  const { skisDatabase, loadDatabase } = useSkiData();

  // 2. Tabs State
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addNewTab,
    removeTab,
    updateActiveTab
  } = useTabsState();

  // 3. Employee Auth
  const {
    isEmployeeMode,
    isPasswordModalOpen,
    passwordError,
    handlePasswordSubmit,
    handleToggleEmployeeMode: toggleEmployeeModeInternal,
    setIsPasswordModalOpen,
    setPasswordError
  } = useEmployeeAuth();

  // 4. App Mode & Other Global State
  const [appMode, setAppMode] = useState<AppMode>(() => {
    const savedAppState = loadAppState();
    return savedAppState?.appMode || 'search';
  });
  const [hasSelectedGroup, setHasSelectedGroup] = useState<boolean>(false);

  // 5. Form Logic
  const {
    heightRef,
    weightRef,
    levelRef,
    genderRef,
    shoeSizeRef,
    handleInputChange,
    handleDateChange,
    setFormData,
    setFormErrors
  } = useFormLogic(activeTab, updateActiveTab);

  // 6. Search Logic
  const {
    equipmentTypeFilter,
    categoryFilter,
    suggestions,
    setEquipmentTypeFilter,
    setCategoryFilter,
    handleSubmit,
    handleSubmitWithStyles,
    handleClear,
    handleStyleToggle,
    filterSearchResults,
    groupMatchesByModel,
    parseDate
  } = useSearchLogic(activeTab, updateActiveTab, skisDatabase);

  // Wrappers for setters from activeTab
  const setSelectedStyles = (styles: string[] | ((prev: string[]) => string[])) => {
    const newStyles = typeof styles === 'function' ? styles(activeTab.selectedStyles) : styles;
    updateActiveTab({ selectedStyles: newStyles });
  };

  const setError = (err: string) => updateActiveTab({ error: err });
  const setIsLoading = (loading: boolean) => updateActiveTab({ isLoading: loading });
  const setCurrentCriteria = (criteria: SearchCriteria | null) => updateActiveTab({ currentCriteria: criteria });

  const setExpandedCategories = (categories: TabData['expandedCategories'] | ((prev: TabData['expandedCategories']) => TabData['expandedCategories'])) => {
    const newCategories = typeof categories === 'function' ? categories(activeTab.expandedCategories) : categories;
    updateActiveTab({ expandedCategories: newCategories });
  };

  const setExpandedRows = (rows: Record<string, number[]> | ((prev: Record<string, number[]>) => Record<string, number[]>)) => {
    const newRows = typeof rows === 'function' ? rows(activeTab.expandedRows) : rows;
    updateActiveTab({ expandedRows: newRows });
  };

  // Complex Logic Implementations (Categories, Filters, etc.) that remained in main hook or need composition

  const toggleCategory = (category: 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile') => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const isCardExpandedInRow = (category: string, cardIndex: number): boolean => {
    return activeTab.expandedRows[category]?.includes(cardIndex) || false;
  };

  const toggleCardInRow = (category: string) => {
    setExpandedRows(prev => {
      const currentExpanded = prev[category] || [];
      if (currentExpanded.length > 0) {
        return { ...prev, [category]: [] };
      } else {
        const cardsToExpand = [];
        const totalCards = activeTab.searchResults?.[category as keyof SearchResults]?.length || 0;
        for (let i = 0; i < totalCards; i++) {
          cardsToExpand.push(i);
        }
        return { ...prev, [category]: cardsToExpand };
      }
    });
  };

  const handleBrowseCriteriaChange = (criteria: Partial<SearchCriteria>) => {
    setFormData(prev => ({
      ...prev,
      height: { ...prev.height, value: criteria.wzrost?.toString() || prev.height.value },
      weight: { ...prev.weight, value: criteria.waga?.toString() || prev.weight.value },
      level: criteria.poziom?.toString() || prev.level,
      gender: criteria.plec?.toUpperCase() || prev.gender
    }));
  };

  const handleFilterSearchChange = (
    filterKey: FilterKey,
    field: 'searchTerm' | 'searchFlex' | 'searchDlugosc',
    value: string
  ) => {
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

  // App Mode Handlers
  const handleToggleEmployeeMode = () => toggleEmployeeModeInternal(appMode, setAppMode);

  const handleBrowseMode = (hasGroup: boolean = false) => {
    setHasSelectedGroup(hasGroup);
    setAppMode('browse');
  };

  const handleBackToSearch = () => {
    setAppMode('search');
    setHasSelectedGroup(false);
  };

  const handleShowAllEquipment = () => {
    handleBrowseMode(false);
  };

  const handleQuickFilterInSearch = (type: string, category: string) => {
    setEquipmentTypeFilter(type);
    setCategoryFilter(category);
  };

  return {
    // State from hooks
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

    // Active Tab shortcuts
    formData: activeTab.formData,
    selectedStyles: activeTab.selectedStyles,
    searchResults: activeTab.searchResults,
    currentCriteria: activeTab.currentCriteria,
    formErrors: activeTab.formErrors,
    error: activeTab.error,
    isLoading: activeTab.isLoading,
    expandedCategories: activeTab.expandedCategories,
    expandedRows: activeTab.expandedRows,

    // Actions
    updateActiveTab,
    addNewTab,
    removeTab,
    setActiveTabId,

    setFormData,
    setSelectedStyles,
    setFormErrors,
    setError,
    setIsLoading,
    setCurrentCriteria,
    setExpandedCategories,
    setExpandedRows,

    handleInputChange,
    handleSubmit,
    handleSubmitWithStyles,
    handleStyleToggle,
    handleClear,

    setAppMode,
    setHasSelectedGroup,
    handleBrowseMode,
    handleBackToSearch,
    handleShowAllEquipment,
    handleQuickFilterInSearch,

    setEquipmentTypeFilter,
    setCategoryFilter,
    filterSearchResults,
    groupMatchesByModel,

    handlePasswordSubmit,
    handleToggleEmployeeMode,
    setIsPasswordModalOpen,
    setPasswordError,

    handleDateChange,
    handleBrowseCriteriaChange,
    handleFilterSearchChange,

    toggleCategory,
    isCardExpandedInRow,
    toggleCardInRow,

    loadDatabase,

    // Computed
    computedInitialFilter: equipmentTypeFilter, // simplistic
    filteredSearchResults: filterSearchResults(activeTab.searchResults),
    groupedResults: activeTab.searchResults ? {
      idealne: groupMatchesByModel(activeTab.searchResults.idealne),
      alternatywy: groupMatchesByModel(activeTab.searchResults.alternatywy),
      poziom_za_nisko: groupMatchesByModel(activeTab.searchResults.poziom_za_nisko),
      inna_plec: groupMatchesByModel(activeTab.searchResults.inna_plec),
      na_sile: groupMatchesByModel(activeTab.searchResults.na_sile),
      wszystkie: groupMatchesByModel(activeTab.searchResults.wszystkie)
    } : null,
    parseDate,

    // Refs
    heightRef,
    weightRef,
    levelRef,
    genderRef,
    shoeSizeRef
  };
};
