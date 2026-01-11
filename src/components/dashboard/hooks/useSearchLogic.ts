import { useState } from 'react';
import type { TabData, FormData } from '../../../types/dashboard.types';
import type { SkiData, SearchResults, SearchCriteria, SkiMatch } from '../../../types/ski.types';
import { SkiMatchingServiceV2 } from '../../../services/skiMatchingServiceV2';
import { validateForm, initialFormErrors, type FormErrors } from '../../../utils/formValidation';
import { saveSearchHistory } from '../../../utils/localStorage';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('useSearchLogic');

export interface UseSearchLogicReturn {
    // Global search state
    equipmentTypeFilter: string;
    categoryFilter: string;
    suggestions: string[];

    // Setters
    setEquipmentTypeFilter: (filter: string) => void;
    setCategoryFilter: (filter: string) => void;
    setSuggestions: (suggestions: string[]) => void;

    // Handlers
    handleSubmit: (customFormData?: FormData) => void;
    handleSubmitWithStyles: (styles: string[]) => void;
    handleClear: () => void;
    handleStyleToggle: (style: string) => void;
    filterSearchResults: (results: SearchResults | null) => SearchResults | null;
    groupMatchesByModel: (matches: SkiMatch[]) => SkiMatch[];
    parseDate: (dateStr: string) => Date | undefined;
}

export const useSearchLogic = (
    activeTab: TabData,
    updateActiveTab: (updates: Partial<TabData>) => void,
    skisDatabase: SkiData[]
): UseSearchLogicReturn => {
    const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Helpers wrapping updateActiveTab
    const setFormErrors = (errors: FormErrors) => updateActiveTab({ formErrors: errors });
    const setError = (err: string) => updateActiveTab({ error: err });
    const setIsLoading = (loading: boolean) => updateActiveTab({ isLoading: loading });
    const setCurrentCriteria = (criteria: SearchCriteria | null) => updateActiveTab({ currentCriteria: criteria });
    const setSearchResults = (results: SearchResults | null) => updateActiveTab({ searchResults: results });
    const setSelectedStyles = (styles: string[]) => updateActiveTab({ selectedStyles: styles });

    // Parsing date helper
    const parseDate = (dateStr: string): Date | undefined => {
        if (!dateStr || dateStr.trim() === '') return undefined;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? undefined : date;
    };

    const autoSelectFirstCategory = (results: SearchResults) => {
        logger.info('useSearchLogic: Automatyczny wybór pierwszej kategorii z wynikami');

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
        logger.info('useSearchLogic: Nie znaleziono żadnej kategorii z wynikami');
    };

    const handleSubmit = (customFormData?: FormData) => {
        const dataToValidate = customFormData || activeTab.formData;
        logger.info('useSearchLogic: Rozpoczęcie walidacji formularza');

        setFormErrors(initialFormErrors);
        setError('');

        const validation = validateForm(dataToValidate);

        if (!validation.isValid) {
            logger.info('useSearchLogic: Formularz zawiera błędy walidacji');
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
                styl_jazdy: activeTab.selectedStyles.length > 0 ? activeTab.selectedStyles : undefined,
                dateFrom: parseDate(dataToValidate.dateFrom),
                dateTo: parseDate(dataToValidate.dateTo)
            };

            logger.info('useSearchLogic: Kryteria wyszukiwania:', criteria);

            setCurrentCriteria(criteria);

            const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
            // First raw results
            setSearchResults(results);
            setSuggestions([]);

            const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
            setSearchResults(sortedResults);

            if (!equipmentTypeFilter && !categoryFilter) {
                logger.info('useSearchLogic: Automatyczny wybór kategorii (brak filtrów)');
                autoSelectFirstCategory(sortedResults);
            } else {
                logger.info('useSearchLogic: Pomijam automatyczny wybór - użytkownik wybrał filtry:', equipmentTypeFilter, categoryFilter);
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

            logger.info('useSearchLogic: Znaleziono wyników:', results.idealne.length);
        } catch (err) {
            logger.error('useSearchLogic: Błąd wyszukiwania:', err);
            setError('Wystąpił błąd podczas wyszukiwania nart');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitWithStyles = (styles: string[]) => {
        logger.info('useSearchLogic: Wyszukiwanie z stylami:', styles);

        try {
            setIsLoading(true);
            setError('');

            const criteria: SearchCriteria = {
                wzrost: parseInt(activeTab.formData.height.value),
                waga: parseInt(activeTab.formData.weight.value),
                poziom: parseInt(activeTab.formData.level),
                plec: activeTab.formData.gender.toUpperCase().trim() as 'M' | 'K',
                styl_jazdy: styles.length > 0 ? styles : undefined,
                dateFrom: parseDate(activeTab.formData.dateFrom),
                dateTo: parseDate(activeTab.formData.dateTo)
            };

            setCurrentCriteria(criteria);

            const results = SkiMatchingServiceV2.findMatchingSkis(skisDatabase, criteria);
            setSearchResults(results);

            const sortedResults = SkiMatchingServiceV2.sortAllResultsByAvailabilityAndCompatibility(results);
            setSearchResults(sortedResults);

        } catch (err) {
            logger.error('useSearchLogic: Błąd wyszukiwania z stylami:', err);
            setError('Wystąpił błąd podczas wyszukiwania nart');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStyleToggle = (style: string) => {
        const newStyles = activeTab.selectedStyles.includes(style)
            ? []
            : [style];

        logger.info(`Wybrano styl ${style}, nowe style:`, newStyles);
        setSelectedStyles(newStyles);

        if (activeTab.searchResults) {
            setTimeout(() => {
                logger.info(`Automatyczne wyszukiwanie po przełączeniu filtra`);
                handleSubmitWithStyles(newStyles);
            }, 100);
        }
    };

    const handleClear = () => {
        logger.info('useSearchLogic: Czyszczenie formularza aktywnej karty');
        const defaultData = {
            dateFrom: '',
            dateTo: '',
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

        logger.info('useSearchLogic: Aktywna karta wyczyszczona');
    };

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

    const filterSearchResults = (results: SearchResults | null): SearchResults | null => {
        if (!results) return null;
        if (!equipmentTypeFilter && !categoryFilter) return results;

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

        return {
            idealne: filterMatches(results.idealne),
            alternatywy: filterMatches(results.alternatywy),
            poziom_za_nisko: filterMatches(results.poziom_za_nisko),
            inna_plec: filterMatches(results.inna_plec),
            na_sile: filterMatches(results.na_sile),
            wszystkie: filterMatches(results.wszystkie)
        };
    };

    return {
        equipmentTypeFilter,
        categoryFilter,
        suggestions,
        setEquipmentTypeFilter,
        setCategoryFilter,
        setSuggestions,
        handleSubmit,
        handleSubmitWithStyles,
        handleClear,
        handleStyleToggle,
        filterSearchResults,
        groupMatchesByModel,
        parseDate
    };
};
