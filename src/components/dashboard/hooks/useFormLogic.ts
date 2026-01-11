import React, { useRef } from 'react';
import type { FormData, TabData } from '../../../types/dashboard.types';
import {
    validateHeightRealtime,
    validateWeightRealtime,
    validateLevelRealtime,
    validateGenderRealtime,
    validateShoeSizeRealtime,
    type FormErrors
} from '../../../utils/formValidation';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('useFormLogic');

export interface UseFormLogicReturn {
    // References
    heightRef: React.RefObject<HTMLInputElement | null>;
    weightRef: React.RefObject<HTMLInputElement | null>;
    levelRef: React.RefObject<HTMLInputElement | null>;
    genderRef: React.RefObject<HTMLInputElement | null>;
    shoeSizeRef: React.RefObject<HTMLInputElement | null>;

    // Handlers
    handleInputChange: (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => void;
    handleDateChange: (section: 'dateFrom' | 'dateTo', value: string) => void;

    // Helpers
    setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
    setFormErrors: (errors: FormErrors | ((prev: FormErrors) => FormErrors)) => void;
}

export const useFormLogic = (
    activeTab: TabData,
    updateActiveTab: (updates: Partial<TabData>) => void
): UseFormLogicReturn => {

    // Refs
    // Initialized with null as expected by useRef for DOM elements but the type is slightly adjusted to match original code usage or React constraints
    const heightRef = useRef<HTMLInputElement | null>(null);
    const weightRef = useRef<HTMLInputElement | null>(null);
    const levelRef = useRef<HTMLInputElement | null>(null);
    const genderRef = useRef<HTMLInputElement | null>(null);
    const shoeSizeRef = useRef<HTMLInputElement | null>(null);

    // Helper setters that wrap updateActiveTab
    const setFormData = (data: FormData | ((prev: FormData) => FormData)) => {
        const newData = typeof data === 'function' ? data(activeTab.formData) : data;
        updateActiveTab({ formData: newData });
    };

    const setFormErrors = (errors: FormErrors | ((prev: FormErrors) => FormErrors)) => {
        const newErrors = typeof errors === 'function' ? errors(activeTab.formErrors) : errors;
        updateActiveTab({ formErrors: newErrors });
    };

    // Helper function to focus and select text
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

    const handleDateChange = (
        section: 'dateFrom' | 'dateTo',
        value: string
    ) => {
        logger.info(`Zmiana daty - sekcja: ${section}, wartość: "${value}"`);

        // Aktualizuj dane formularza
        setFormData((prev: FormData) => ({
            ...prev,
            [section]: value
        }));

        // Wyczyść błędy dla tego pola
        setFormErrors((prev: FormErrors) => ({
            ...prev,
            [section]: ''
        }));
    };

    const handleInputChange = (section: keyof FormData, field: string, value: string, inputRef?: HTMLInputElement) => {
        logger.debug(`Zmiana pola - sekcja: ${section}, pole: ${field}, wartość: "${value}"`);

        // Walidacja w czasie rzeczywistym
        let isValid = true;
        let errorMessage = '';

        if (section === 'height' && field === 'value') {
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
        if (section === 'height' || section === 'weight') {
            setFormData((prev: FormData) => ({
                ...prev,
                [section]: {
                    ...prev[section as 'height' | 'weight'],
                    [field]: value
                }
            }));
        } else {
            setFormData((prev: FormData) => ({
                ...prev,
                [section]: value
            }));
        }

        // Wyczyść błędy dla tego pola
        setFormErrors((prev: FormErrors) => {
            const newErrors = { ...prev };
            if (
                section === 'height' ||
                section === 'weight' ||
                section === 'level' ||
                section === 'gender' ||
                section === 'shoeSize' ||
                section === 'dateFrom' ||
                section === 'dateTo'
            ) {
                newErrors[section] = '';
            }
            return newErrors;
        });

        // Automatyczne przechodzenie do następnego pola
        if (inputRef) {
            if (section === 'height' && field === 'value') {
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

    return {
        heightRef,
        weightRef,
        levelRef,
        genderRef,
        shoeSizeRef,
        handleInputChange,
        handleDateChange,
        setFormData,
        setFormErrors
    };
};
