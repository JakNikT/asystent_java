/**
 * src/components/dashboard/DashboardActions.tsx: Komponent przycisków akcji Dashboard
 * Wrapper dla EmployeeControls z dodatkową logiką zarządzania trybem pracownika
 */

import React from 'react';
import EmployeeControls from './EmployeeControls';
import type { AppMode } from '../../types/dashboard.types';

interface DashboardActionsProps {
  isEmployeeMode: boolean;
  appMode: AppMode;
  onClear: () => void;
  onBrowse: () => void;
  onHistory: () => void;
  onReservations: () => void;
}

/**
 * src/components/dashboard/DashboardActions.tsx: Komponent przycisków akcji Dashboard
 * Opakowuje EmployeeControls i przekazuje wszystkie potrzebne props
 */
export const DashboardActions: React.FC<DashboardActionsProps> = ({
  isEmployeeMode,
  appMode,
  onClear,
  onBrowse,
  onHistory,
  onReservations
}) => {
  return (
    <EmployeeControls
      isEmployeeMode={isEmployeeMode}
      appMode={appMode}
      onClear={onClear}
      onBrowse={onBrowse}
      onHistory={onHistory}
      onReservations={onReservations}
    />
  );
};
