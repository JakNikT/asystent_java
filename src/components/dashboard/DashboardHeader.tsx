// src/components/dashboard/DashboardHeader.tsx: Komponent layoutowy nagłówka z logo i kontenerem formularza

import React, { useState } from 'react';
import EquipmentFilters from './EquipmentFilters';
import { ConflictCheckerModal } from '../ConflictCheckerModal';
import type { AppMode } from '../../types/dashboard.types';

interface DashboardHeaderProps {
  children: React.ReactNode;
  equipmentTypeFilter?: string;
  categoryFilter?: string;
  appMode?: AppMode;
  onQuickFilter?: (type: string, category: string) => void;
  onShowAllEquipment?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  children,
  equipmentTypeFilter = '',
  categoryFilter = '',
  appMode = 'search',
  onQuickFilter,
  onShowAllEquipment
}) => {
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  
  return (
    <>
      {/* Logo "narty poznań" - POWIĘKSZONE okrągłe logo z cieniem - NAD całym layoutem */}
      <div className="flex items-center justify-center mt-4 lg:mt-6 mb-4 lg:mb-6">
        <img 
          src="/images/logo.png" 
          alt="Narty Poznań Logo" 
          className="w-[180px] h-[180px] lg:w-[220px] lg:h-[220px] rounded-full object-cover shadow-2xl shadow-black/50 border-4 border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ clipPath: 'circle(50%)' }}
          onClick={() => setIsConflictModalOpen(true)}
          title="Kliknij aby sprawdzić konflikty w kalendarzu sprzętu"
        />
      </div>
      
      {/* Modal sprawdzania konfliktów */}
      <ConflictCheckerModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
      />
      
      {/* Main Content Container - bez zewnętrznego layoutu */}
      <div className="w-full max-w-[1100px] mx-auto my-4 lg:my-6 flex flex-col gap-4 px-3 lg:px-0">
        <div className="w-full bg-brand-dark/50 backdrop-blur-sm rounded-[20px] flex flex-col lg:flex-row items-center justify-center gap-3 p-3 lg:p-6 border border-white/10 shadow-xl shadow-black/30">
          {children}
        </div>

        {/* Equipment Filters Container - na dole z tym samym stylem */}
        {onQuickFilter && onShowAllEquipment && (
          <div className="w-full bg-brand-dark/50 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center gap-3 p-4 lg:p-6 border border-white/10 shadow-xl shadow-black/30">
            <EquipmentFilters
              equipmentTypeFilter={equipmentTypeFilter}
              categoryFilter={categoryFilter}
              appMode={appMode}
              onQuickFilter={onQuickFilter}
              onShowAllEquipment={onShowAllEquipment}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardHeader;




