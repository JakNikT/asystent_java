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
  console.log('src/components/dashboard/EmployeeControls.tsx: Renderowanie kontrolek pracownika, tryb:', _appMode, 'isEmployeeMode:', isEmployeeMode);

  return (
    <div className="w-full lg:w-auto flex-1 p-5 bg-black/20 rounded-xl border border-white/10 flex flex-col justify-center gap-4 shadow-2xl shadow-black/40 backdrop-blur-md">
      {/* Action Buttons - bezpośrednio w kontenerze */}
      <button
        onClick={onClear}
        className="w-full h-10 bg-primary text-white border-transparent focus:border-blue-400 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 hover:bg-primary/80 transition-all font-bold text-sm uppercase tracking-wider"
      >
        🗑️ Wyczyść
      </button>
      
      <button 
        onClick={onBrowse}
        className="w-full h-10 bg-primary text-white border-transparent focus:border-blue-400 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 hover:bg-primary/80 transition-all font-bold text-sm uppercase tracking-wider"
      >
        📋 Przeglądaj
      </button>
      
      <button 
        onClick={onHistory}
        className="w-full h-10 bg-primary text-white border-transparent focus:border-blue-400 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 hover:bg-primary/80 transition-all font-bold text-sm uppercase tracking-wider"
      >
        📜 Historia
      </button>
      
      {/* Przycisk "Wydania" - zawsze widoczny */}
      <button 
        onClick={onReservations}
        className="w-full h-10 bg-primary text-white border-transparent focus:border-blue-400 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 hover:bg-primary/80 transition-all font-bold text-sm uppercase tracking-wider cursor-pointer"
      >
        📦 Wydania
      </button>
    </div>
  );
};

export default EmployeeControls;
