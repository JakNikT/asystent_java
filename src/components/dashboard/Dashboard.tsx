/**
 * src/components/dashboard/Dashboard.tsx: Główny komponent Dashboard
 * Po refaktoryzacji - używa hooka useDashboardState i mniejszych komponentów
 */

import React, { Suspense, lazy } from 'react';
// src/components/dashboard/Dashboard.tsx: Lazy loading dla dużych komponentów w celu optymalizacji rozmiaru chunków
// Konwertujemy named exports na default exports dla React.lazy
const BrowseSkisComponent = lazy(() => 
  import('../BrowseSkisComponent').then(module => ({ default: module.BrowseSkisComponent }))
);
const ReservationsView = lazy(() => 
  import('../ReservationsView').then(module => ({ default: module.ReservationsView }))
);
const HistoryView = lazy(() => 
  import('../HistoryView').then(module => ({ default: module.HistoryView }))
);
import TabNavigation from './TabNavigation';
import DashboardHeader from './DashboardHeader';
import { DashboardForm } from './DashboardForm';
import { DashboardActions } from './DashboardActions';
import { SearchResults } from './SearchResults';
import PasswordModal from '../PasswordModal';
import { Layout } from '../layout/Layout';
import { useDashboardState } from './useDashboardState';

const Dashboard: React.FC = () => {
  // src/components/dashboard/Dashboard.tsx: Użycie hooka zarządzania stanem
  const dashboardState = useDashboardState();
  
  // Destrukturyzacja stanu i funkcji z hooka
  const {
    tabs,
    activeTabId,
    activeTab,
    appMode,
    hasSelectedGroup,
    equipmentTypeFilter,
    categoryFilter,
    isPasswordModalOpen,
    passwordError,
    isEmployeeMode,
    skisDatabase,
    suggestions,
    formData,
    selectedStyles,
    searchResults,
    currentCriteria,
    formErrors,
    error,
    isLoading,
    expandedCategories,
    addNewTab,
    removeTab,
    setActiveTabId,
    handleInputChange,
    handleClear,
    setAppMode,
    setHasSelectedGroup,
    handleBrowseMode,
    handleBackToSearch,
    handleShowAllEquipment,
    handleQuickFilterInSearch,
    handleToggleEmployeeMode,
    handlePasswordSubmit,
    setIsPasswordModalOpen,
    setPasswordError,
    parseDate,
    handleDateFieldClick,
    handleDateChange,
    handleBrowseCriteriaChange,
    handleFilterSearchChange,
    toggleCategory,
    isCardExpandedInRow,
    toggleCardInRow,
    handleStyleToggle,
    loadDatabase,
    computedInitialFilter,
    groupedResults,
    dayFromRef,
    monthFromRef,
    dayToRef,
    monthToRef,
    heightRef,
    weightRef,
    levelRef,
    genderRef,
    shoeSizeRef,
  } = dashboardState;

  return (
    <Layout
      navigation={
        /* Tabs Navigation - System kart responsywny, scrollowalny poziomo na mobile - tylko w trybie przeglądaj */
        appMode === 'browse' ? (
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onAddTab={addNewTab}
            onRemoveTab={removeTab}
            isEmployeeMode={isEmployeeMode}
            onToggleEmployeeMode={handleToggleEmployeeMode}
            appMode={appMode}
          />
        ) : null
      }
      header={
        /* Header Section - responsywne - NOWY LAYOUT: Logo ponad formularzem */
        <DashboardHeader
          equipmentTypeFilter={equipmentTypeFilter}
          categoryFilter={categoryFilter}
          appMode={appMode}
          onQuickFilter={handleQuickFilterInSearch}
          onShowAllEquipment={handleShowAllEquipment}
        >
          <DashboardForm
            formData={formData}
            formErrors={formErrors}
            onFieldChange={handleInputChange as (section: keyof FormData | string, field: string, value: string, el?: HTMLInputElement) => void}
            handleDateFieldClick={handleDateFieldClick}
            dayFromRef={dayFromRef}
            monthFromRef={monthFromRef}
            dayToRef={dayToRef}
            monthToRef={monthToRef}
            heightRef={heightRef}
            weightRef={weightRef}
            levelRef={levelRef}
            genderRef={genderRef}
            shoeSizeRef={shoeSizeRef}
          />
          <DashboardActions
            isEmployeeMode={isEmployeeMode}
            appMode={appMode}
            onClear={handleClear}
            onBrowse={() => handleBrowseMode(false)}
            onHistory={() => setAppMode('history')}
            onReservations={() => setAppMode('reservations')}
          />
        </DashboardHeader>
      }
    >
        {/* Results Section - responsywna */}
        {/* WYŁĄCZONE: Inteligentne sugestie i Results Container z kartami nart */}
        {/* Kod został wyłączony - w nowym systemie wyniki są wyświetlane tylko w widoku "Przeglądaj" (BrowseSkisComponent) */}
        {/* Użyj przycisku "Przeglądaj" aby zobaczyć wszystkie narty z filtrowaniem */}
        
        {/* SearchResults component - wyłączony (wyniki są wyświetlane w widoku "Przeglądaj") */}
        {false && (
          <SearchResults
            searchResults={searchResults}
            groupedResults={groupedResults}
            isLoading={isLoading}
            error={error}
            formErrors={formErrors}
            formData={formData}
            equipmentTypeFilter={equipmentTypeFilter}
            selectedStyles={selectedStyles}
            currentCriteria={currentCriteria}
            skisDatabase={skisDatabase}
            expandedCategories={expandedCategories}
            isCardExpandedInRow={isCardExpandedInRow}
            toggleCategory={toggleCategory}
            toggleCardInRow={toggleCardInRow}
            handleStyleToggle={handleStyleToggle}
            isEmployeeMode={isEmployeeMode}
            suggestions={suggestions}
          />
        )}
      
      {/* Renderowanie komponentu przeglądania */}
      {appMode === 'browse' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-xl font-black font-['Inter'] italic">
                ⏳ Ładowanie...
              </span>
            </div>
          }>
            <BrowseSkisComponent
              allSkis={skisDatabase}
              browseCriteria={{
                wzrost: formData.height.value ? parseInt(formData.height.value) : undefined,
                waga: formData.weight.value ? parseInt(formData.weight.value) : undefined,
                poziom: formData.level ? parseInt(formData.level) : undefined,
                plec: formData.gender ? (formData.gender.toUpperCase() as 'M' | 'K' | 'W') : undefined,
                dateFrom: parseDate(formData.dateFrom),
                dateTo: parseDate(formData.dateTo)
              }}
              onBack={handleBackToSearch}
              initialFilter={computedInitialFilter}
              tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
              activeTabId={activeTabId}
              onTabChange={(tabId) => setActiveTabId(tabId)}
              onAddTab={addNewTab}
              onRemoveTab={removeTab}
              onRefreshData={loadDatabase}
              isEmployeeMode={isEmployeeMode}
              onCriteriaChange={handleBrowseCriteriaChange}
              onFilterSearchChange={handleFilterSearchChange}
              filterSearchStates={activeTab.filterSearchStates}
              hasSelectedGroup={hasSelectedGroup}
              onGroupSelected={() => setHasSelectedGroup(true)}
              formData={formData}
              formErrors={formErrors}
              onDateChange={handleDateChange}
            />
          </Suspense>
        </div>
      )}

      {/* Renderowanie widoku rezerwacji */}
      {appMode === 'reservations' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-xl font-black font-['Inter'] italic">
                ⏳ Ładowanie rezerwacji...
              </span>
            </div>
          }>
            <ReservationsView 
              onBackToSearch={() => setAppMode('search')}
            />
          </Suspense>
        </div>
      )}

      {/* Renderowanie widoku historii */}
      {appMode === 'history' && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-xl font-black font-['Inter'] italic">
                ⏳ Ładowanie historii...
              </span>
            </div>
          }>
            <HistoryView 
              onBack={() => setAppMode('search')}
            />
          </Suspense>
        </div>
      )}

      {/* Renderowanie modala hasła */}
      {isPasswordModalOpen && (
        <PasswordModal
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPasswordError(''); // Wyczyść błąd przy zamykaniu
          }}
          onSubmit={handlePasswordSubmit}
          errorMessage={passwordError}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
