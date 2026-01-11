import { useState } from 'react';
import type { TabData } from '../../../types/dashboard.types';
import { initialFormErrors } from '../../../utils/formValidation';

export interface UseTabsStateReturn {
    tabs: TabData[];
    activeTabId: string;
    activeTab: TabData;
    setActiveTabId: (id: string) => void;
    setTabs: React.Dispatch<React.SetStateAction<TabData[]>>;
    updateActiveTab: (updates: Partial<TabData>) => void;
    addNewTab: () => void;
    removeTab: (tabId: string) => void;
}

export const useTabsState = (): UseTabsStateReturn => {
    const [tabs, setTabs] = useState<TabData[]>([
        {
            id: '1',
            label: 'Osoba 1',
            formData: {
                dateFrom: '',
                dateTo: '',
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

    const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

    const updateActiveTab = (updates: Partial<TabData>) => {
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, ...updates } : tab
        ));
    };

    const addNewTab = () => {
        const newId = (tabs.length + 1).toString();
        const newTab: TabData = {
            id: newId,
            label: `Osoba ${newId}`,
            formData: {
                dateFrom: '',
                dateTo: '',
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

    return {
        tabs,
        activeTabId,
        activeTab,
        setActiveTabId,
        setTabs,
        updateActiveTab,
        addNewTab,
        removeTab
    };
};
