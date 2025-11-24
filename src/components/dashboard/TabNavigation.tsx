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
  isEmployeeMode,
  onToggleEmployeeMode,
  appMode: _appMode // Zachowane dla przyszłej użyteczności
}) => {
  return (
    <div className="relative w-full bg-[#194576] border-b-2 border-[#2C699F] py-2 px-4">
      {/* Przycisk logowania/wylogowania dla pracownika */}
      <button
        onClick={onToggleEmployeeMode}
        className={`absolute top-1/2 right-4 -translate-y-1/2 z-50 font-bold p-2 rounded-lg shadow-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isEmployeeMode 
            ? 'bg-green-600/80 hover:bg-green-700/90 text-white' 
            : 'bg-blue-900/50 hover:bg-blue-800/70 text-white'
        }`}
        aria-label={isEmployeeMode ? "Wyloguj się (przełącz na tryb klienta)" : "Zaloguj się jako pracownik"}
        title={isEmployeeMode ? "Kliknij aby wylogować się i przełączyć na tryb klienta" : "Zaloguj się jako pracownik"}
      >
        <span className="text-xl">{isEmployeeMode ? '🔓' : '🔒'}</span>
      </button>

      <div className="max-w-[1100px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-[#2C699F] scrollbar-track-[#194576] pr-16">
        {/* Renderuj karty */}
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group relative px-4 py-2 rounded-t-lg font-['Inter'] font-bold text-sm transition-all whitespace-nowrap min-w-[100px] ${
              activeTabId === tab.id
                ? 'bg-[#386BB2] text-white'
                : 'bg-[#2C699F] text-[#A6C2EF] hover:bg-[#194576] hover:text-white'
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
                className="ml-2 text-red-400 hover:text-red-600 cursor-pointer"
              >
                ✕
              </span>
            )}
          </button>
        ))}
        
        {/* Przycisk dodawania nowej karty - sticky na mobile */}
        <button
          onClick={onAddTab}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-['Inter'] font-bold text-sm transition-all flex items-center gap-1 whitespace-nowrap sticky right-0 shadow-lg"
          title="Dodaj nową osobę"
        >
          ➕ Nowa osoba
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;

