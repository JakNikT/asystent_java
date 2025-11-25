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
  appMode,
  onQuickFilter,
  onShowAllEquipment
}) => {
  return (
    <div className="w-full max-w-[900px] bg-[#194576] rounded-lg p-3 mb-3" style={{ boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)' }}>
      {/* Wszystkie przyciski w jednym wierszu - responsywne */}
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <button
          onClick={() => onQuickFilter('NARTY', 'TOP')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'TOP'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          🎿 Narty TOP
        </button>
        <button
          onClick={() => onQuickFilter('NARTY', 'VIP')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'VIP'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          🎿 Narty VIP
        </button>
        <button
          onClick={() => onQuickFilter('NARTY', 'JUNIOR')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'NARTY' && categoryFilter === 'JUNIOR'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          👶 Narty JUNIOR
        </button>
        <button
          onClick={() => onQuickFilter('BUTY', 'JUNIOR')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY' && categoryFilter === 'JUNIOR'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          👶 Buty Junior
        </button>
        <button
          onClick={() => onQuickFilter('BUTY', 'DOROSLE')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY' && categoryFilter === 'DOROSLE'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          🥾 Buty Dorosłe
        </button>
        <button
          onClick={() => onQuickFilter('DESKI', '')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'DESKI'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          🏂 Deski
        </button>
        <button
          onClick={() => onQuickFilter('BUTY_SNOWBOARD', '')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            equipmentTypeFilter === 'BUTY_SNOWBOARD'
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          👢 Buty SB
        </button>
        <button
          onClick={onShowAllEquipment}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
            !equipmentTypeFilter && !categoryFilter && appMode === 'browse'
              ? 'bg-gray-500 text-white shadow-lg'
              : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'
          }`}
        >
          📦 Cały sprzęt
        </button>
      </div>
    </div>
  );
};

export default EquipmentFilters;




