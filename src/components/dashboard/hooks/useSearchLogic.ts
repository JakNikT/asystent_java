import { useState } from 'react';
import type { TabData } from '../../../types/dashboard.types';
import { initialFormErrors } from '../../../utils/formValidation';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('useSearchLogic');

export interface UseSearchLogicReturn {
    // Global search state
    equipmentTypeFilter: string;
    categoryFilter: string;

    // Setters
    setEquipmentTypeFilter: (filter: string) => void;
    setCategoryFilter: (filter: string) => void;

    // Handlers
    handleClear: () => void;
    parseDate: (dateStr: string) => Date | undefined;
}

export const useSearchLogic = (
    updateActiveTab: (updates: Partial<TabData>) => void
): UseSearchLogicReturn => {
    const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    // Parsing date helper
    const parseDate = (dateStr: string): Date | undefined => {
        if (!dateStr || dateStr.trim() === '') return undefined;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? undefined : date;
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

    return {
        equipmentTypeFilter,
        categoryFilter,
        setEquipmentTypeFilter,
        setCategoryFilter,
        handleClear,
        parseDate
    };
};
