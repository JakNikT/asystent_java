// src/components/dashboard/EmployeeControls.tsx: Komponent przycisków akcji (Wyczyść, Przeglądaj, Historia, Rezerwacje)

import React from 'react';
import type { AppMode } from '../../types/dashboard.types';

interface EmployeeControlsProps {
  isEmployeeMode: boolean;
  appMode: AppMode; // Zachowane dla przyszłej użyteczności (np. podświetlanie aktywnego trybu)
  onClear: () => void;
  onBrowse: () => void;
  onHistory: () => void;
  onReservations: () => void;
}

const EmployeeControls: React.FC<EmployeeControlsProps> = ({
  isEmployeeMode,
  appMode: _appMode, // Zachowane dla przyszłej użyteczności (np. podświetlanie aktywnego trybu)
  onClear,
  onBrowse,
  onHistory,
  onReservations
}) => {
  return (
    <div className="w-full lg:w-[140px] h-auto lg:min-h-[200px] p-2 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-center items-center gap-2" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)' }}>
      {/* Action Buttons - POWIĘKSZONE PIONOWO w jednej kolumnie */}
      <button
        onClick={onClear}
        className="w-full h-14 lg:h-[50px] bg-[#194576] rounded-[5px] flex items-center justify-center px-2 hover:bg-[#2C699F] transition-all"
        style={{ boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.4)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)'}
      >
        <span className="text-white text-base lg:text-sm font-black font-['Inter'] italic leading-tight">🗑️ Wyczyść</span>
      </button>
      <button 
        onClick={onBrowse}
        className="w-full h-14 lg:h-[50px] bg-[#194576] rounded-[5px] shadow-md hover:shadow-lg flex items-center justify-center px-2 hover:bg-[#2C699F] transition-all"
      >
        <span className="text-white text-base lg:text-sm font-black font-['Inter'] italic leading-tight whitespace-nowrap">📋 Przeglądaj</span>
      </button>
      <button 
        onClick={onHistory}
        className="w-full h-14 lg:h-[50px] bg-[#194576] rounded-[5px] shadow-md hover:shadow-lg flex items-center justify-center px-2 hover:bg-[#2C699F] transition-all"
      >
        <span className="text-white text-base lg:text-sm font-black font-['Inter'] italic leading-tight whitespace-nowrap">📜 Historia</span>
      </button>
      {/* Przycisk "Rezerwacje" - widoczny tylko w trybie pracownika */}
      {isEmployeeMode && (
        <button 
          onClick={onReservations}
          className="w-full h-14 lg:h-[50px] bg-[#194576] rounded-[5px] shadow-md hover:shadow-lg flex items-center justify-center px-2 hover:bg-[#2C699F] transition-all cursor-pointer"
        >
          <span className="text-white text-base lg:text-sm font-black font-['Inter'] italic leading-tight whitespace-nowrap">🔄 Rezerwacje</span>
        </button>
      )}
    </div>
  );
};

export default EmployeeControls;

