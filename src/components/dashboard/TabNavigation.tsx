// src/components/dashboard/TabNavigation.tsx: Komponent paska zakładek (kart osób)

import React from 'react';
import type { TabData, AppMode } from '../../types/dashboard.types';

interface TabNavigationProps {
  tabs: TabData[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onAddTab: () => void;
  onRemoveTab: (id: string) => void;
  isEmployeeMode: boolean;
  onToggleEmployeeMode: () => void;
  appMode: AppMode; // Używane w Dashboard do sprawdzania czy wrócić do search przy wylogowaniu
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onRemoveTab,
  isEmployeeMode: _isEmployeeMode, // Zachowane dla przyszłej użyteczności (używane w zakomentowanym kodzie)
  onToggleEmployeeMode: _onToggleEmployeeMode, // Zachowane dla przyszłej użyteczności (używane w zakomentowanym kodzie)
  appMode: _appMode // Zachowane dla przyszłej użyteczności
}) => {
  return (
    <div className="relative w-full bg-brand-dark border-b border-white/10 py-2 px-4 shadow-md">
      {/* Przycisk logowania/wylogowania dla pracownika - WYŁĄCZONY */}
      {/* <button
        onClick={onToggleEmployeeMode}
        className={`absolute top-1/2 right-4 -translate-y-1/2 z-50 font-bold p-2 rounded-lg shadow-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isEmployeeMode 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-black/20 hover:bg-black/40 text-white/80 hover:text-white'
        }`}
        aria-label={isEmployeeMode ? "Wyloguj się (przełącz na tryb klienta)" : "Zaloguj się jako pracownik"}
        title={isEmployeeMode ? "Kliknij aby wylogować się i przełączyć na tryb klienta" : "Zaloguj się jako pracownik"}
      >
        <span className="text-xl">{isEmployeeMode ? '🔓' : '🔒'}</span>
      </button> */}

      <div className="max-w-[1100px] mx-auto flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Renderuj karty */}
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group relative px-4 py-2 rounded-t-lg font-['Inter'] font-bold text-sm transition-all whitespace-nowrap min-w-[100px] flex items-center gap-2 ${
              activeTabId === tab.id
                ? 'bg-background text-foreground shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] translate-y-[1px]'
                : 'bg-black/20 text-white/70 hover:bg-black/30 hover:text-white'
            }`}
          >
            {tab.label}
            {/* Przycisk usuwania karty (tylko jeśli jest więcej niż 1 karta) */}
            {tabs.length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTab(tab.id);
                }}
                className={`ml-2 rounded-full p-0.5 transition-colors ${
                  activeTabId === tab.id 
                    ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10' 
                    : 'text-white/50 hover:text-red-300'
                }`}
              >
                ✕
              </span>
            )}
          </button>
        ))}
        
        {/* Przycisk dodawania nowej karty - sticky na mobile */}
        <button
          onClick={onAddTab}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-['Inter'] font-bold text-sm transition-all flex items-center gap-1 whitespace-nowrap sticky right-0 shadow-lg ml-2"
          title="Dodaj nową osobę"
        >
          ➕ <span className="hidden sm:inline">Nowa osoba</span>
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;

