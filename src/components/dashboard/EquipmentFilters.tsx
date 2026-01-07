// src/components/dashboard/EquipmentFilters.tsx: Komponent przycisków filtrowania kategorii sprzętu

import React from 'react';
import type { AppMode } from '../../types/dashboard.types';

interface EquipmentFiltersProps {
  equipmentTypeFilter: string;
  categoryFilter: string;
  appMode: AppMode;
  onQuickFilter: (type: string, category: string) => void;
  onShowAllEquipment: () => void;
}

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({
  equipmentTypeFilter,
  categoryFilter,
  appMode: _appMode, // Zachowane dla przyszłej użyteczności
  onQuickFilter,
  onShowAllEquipment
}) => {
  return (
    <>
      {/* Przyciski w dwóch wierszach - responsywne */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 justify-center items-center w-full">
        <button
          onClick={() => onQuickFilter('NARTY', 'TOP')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'TOP'
              ? 'bg-blue-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          🎿 Narty TOP
        </button>
        <button
          onClick={() => onQuickFilter('NARTY', 'VIP')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'VIP'
              ? 'bg-blue-700 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          🎿 Narty VIP
        </button>
        <button
          onClick={() => onQuickFilter('NARTY', 'JUNIOR')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'JUNIOR'
              ? 'bg-green-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          👶 Narty JUNIOR
        </button>
        <button
          onClick={() => onQuickFilter('BUTY', 'JUNIOR')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY' && categoryFilter === 'JUNIOR'
              ? 'bg-green-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          👶 Buty Junior
        </button>
        <button
          onClick={() => onQuickFilter('BUTY', 'DOROSLE')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY' && categoryFilter === 'DOROSLE'
              ? 'bg-purple-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          🥾 Buty Dorosłe
        </button>
        <button
          onClick={() => onQuickFilter('DESKI', '')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'DESKI'
              ? 'bg-orange-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          🏂 Deski
        </button>
        <button
          onClick={() => onQuickFilter('BUTY_SNOWBOARD', '')}
          className={`px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY_SNOWBOARD'
              ? 'bg-red-600 text-white shadow-xl shadow-black/40 border border-white/20'
              : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5'
          }`}
        >
          👢 Buty SB
        </button>
        <button
          onClick={onShowAllEquipment}
          className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 hover:border-white/20 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 border border-white/5"
        >
          🌐 Wszystkie
        </button>
      </div>
    </>
  );
};

export default EquipmentFilters;




