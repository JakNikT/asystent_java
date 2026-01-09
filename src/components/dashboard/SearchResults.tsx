/**
 * src/components/dashboard/SearchResults.tsx: Komponent wyświetlania wyników wyszukiwania
 * Renderuje wyniki wyszukiwania nart w różnych kategoriach
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DetailedCompatibility } from '../DetailedCompatibility';
import { SkiStyleBadge } from '../SkiStyleBadge';
import { formatModelName, formatBrandName } from '../../utils/nameFormatter';
import type { SearchResults as SearchResultsType, SearchCriteria, SkiData } from '../../types/ski.types';
import type { FormData, TabData } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';

interface SearchResultsProps {
  searchResults: SearchResultsType | null;
  groupedResults: SearchResultsType | null;
  isLoading: boolean;
  error: string;
  formErrors: FormErrors;
  formData: FormData;
  equipmentTypeFilter: string;
  selectedStyles: string[];
  currentCriteria: SearchCriteria | null;
  skisDatabase: SkiData[];
  expandedCategories: TabData['expandedCategories'];
  isCardExpandedInRow: (category: string, cardIndex: number) => boolean;
  toggleCategory: (category: 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile') => void;
  toggleCardInRow: (category: string) => void;
  handleStyleToggle: (style: string) => void;
  isEmployeeMode: boolean;
  suggestions?: string[];
}

// Variants dla animacji
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

/**
 * src/components/dashboard/SearchResults.tsx: Komponent wyświetlania wyników wyszukiwania
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  groupedResults,
  isLoading,
  error,
  formErrors,
  formData,
  equipmentTypeFilter,
  selectedStyles,
  currentCriteria,
  skisDatabase,
  expandedCategories,
  isCardExpandedInRow,
  toggleCategory,
  toggleCardInRow,
  handleStyleToggle,
  isEmployeeMode,
  suggestions = []
}) => {
  return (
    <>
      {/* Inteligentne sugestie */}
      {suggestions.length > 0 && (
        <div className="w-full bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 rounded mb-2">
          <h3 className="font-bold mb-2 text-sm">💡 Inteligentne sugestie:</h3>
          <ul className="list-disc list-inside space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs">{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Results Container - pełnoekranowy */}
      <motion.div 
        className="w-full min-h-[400px] bg-[#194576] rounded-[20px] flex justify-center items-start gap-2.5 p-2"
        animate={{ maxWidth: (searchResults?.wszystkie?.length ?? 0) > 0 ? '100%' : '900px' }}
        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      >
        <div className="w-full min-h-[380px] bg-[#A6C2EF] rounded-[20px] p-4 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-xl font-black font-['Inter'] italic">
                ⏳ Wyszukiwanie nart...
              </span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <span className="text-red-600 text-lg font-black font-['Inter'] italic">
                ❌ {error}
              </span>
              
              {/* Wyświetl szczegółowe błędy walidacji */}
              {(formErrors.height || formErrors.weight || formErrors.level || formErrors.gender || 
                formErrors.dateFrom || formErrors.dateTo) && (
                <div className="text-red-400 text-sm font-bold space-y-1">
                  {formErrors.height && <div>• Wzrost: {formErrors.height}</div>}
                  {formErrors.weight && <div>• Waga: {formErrors.weight}</div>}
                  {formErrors.level && <div>• Poziom: {formErrors.level}</div>}
                  {formErrors.gender && <div>• Płeć: {formErrors.gender}</div>}
                  {formErrors.dateFrom && <div>• Data od: {formErrors.dateFrom}</div>}
                  {formErrors.dateTo && <div>• Data do: {formErrors.dateTo}</div>}
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && !searchResults && (
            <div className="flex items-center justify-center h-full text-center px-4">
              <span className="text-white text-lg font-black font-['Inter'] italic">
                👋 Witaj! Wypełnij formularz i wybierz kategorię sprzętu poniżej 👇
              </span>
            </div>
          )}

          {!isLoading && !error && searchResults && (
            <div className="space-y-4">
              {searchResults && searchResults.wszystkie.length === 0 && (
                <div className="text-center">
                  <span className="text-white text-lg font-black font-['Inter'] italic">
                    😔 Nie znaleziono nart pasujących do Twoich kryteriów
                  </span>
                </div>
              )}

              {/* Kategoria: IDEALNE */}
              {groupedResults && groupedResults.idealne.length > 0 && (
                <div>
                  {/* Style jazdy - tylko dla poziomu 4+ */}
                  {parseInt(formData.level) >= 4 && equipmentTypeFilter === 'NARTY' && (
                    <div className="w-full bg-[#194576]/50 rounded-lg p-3 mb-3">
                      <div className="flex flex-wrap gap-2 justify-center items-center">
                        {[
                          { id: 'SL', label: '🎿 Slalom', emoji: 'SL' },
                          { id: 'G', label: '⛷️ Gigant', emoji: 'G' },
                          { id: 'SLG', label: '🎯 Pomiędzy', emoji: 'SLG' },
                          { id: 'OFF', label: '🏔️ Poza trasę', emoji: 'OFF' }
                        ].map((style) => (
                          <label 
                            key={style.id} 
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                              selectedStyles.includes(style.id)
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-[#2C699F] text-white hover:bg-[#386BB2]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStyles.includes(style.id)}
                              onChange={() => handleStyleToggle(style.id)}
                              className="hidden"
                            />
                            {style.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                    🏆 IDEALNE DOPASOWANIE ({groupedResults.idealne.length})
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {groupedResults.idealne.map((match, idx) => (
                        <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-white/20 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col items-center space-y-1">
                              <SkiStyleBadge 
                                przeznaczenie={match.ski.PRZEZNACZENIE}
                                atuty={match.ski.ATUTY}
                              />
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                {match.ski.DLUGOSC}cm
                              </div>
                            </div>
                            
                            <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                              <div className="font-black text-base">
                                {formatBrandName(match.ski)} {formatModelName(match.ski)}
                              </div>
                              <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                KOD: {match.ski.KOD}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                <span className={`${
                                  match.compatibility >= 90 ? 'text-green-400' :
                                  match.compatibility >= 70 ? 'text-yellow-400' :
                                  match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {match.compatibility}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <DetailedCompatibility 
                            match={match}
                            userCriteria={currentCriteria!}
                            skisDatabase={skisDatabase}
                            isRowExpanded={isCardExpandedInRow('idealne', idx)}
                            onRowToggle={() => toggleCardInRow('idealne')}
                            isEmployeeMode={isEmployeeMode}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}

              {/* Kategoria: ALTERNATYWY */}
              {groupedResults && groupedResults.alternatywy.length > 0 && (
                <div>
                  <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                    ⭐ ALTERNATYWY ({groupedResults.alternatywy.length})
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {(expandedCategories.alternatywy ? groupedResults.alternatywy : groupedResults.alternatywy.slice(0, 8)).map((match, idx) => (
                        <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-white/15 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col items-center space-y-1">
                              <SkiStyleBadge 
                                przeznaczenie={match.ski.PRZEZNACZENIE}
                                atuty={match.ski.ATUTY}
                              />
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                {match.ski.DLUGOSC}cm
                              </div>
                            </div>
                            
                            <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                              <div className="font-black text-base">
                                {formatBrandName(match.ski)} {formatModelName(match.ski)}
                              </div>
                              <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                KOD: {match.ski.KOD}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                <span className={`${
                                  match.compatibility >= 90 ? 'text-green-400' :
                                  match.compatibility >= 70 ? 'text-yellow-400' :
                                  match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {match.compatibility}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <DetailedCompatibility 
                            match={match}
                            userCriteria={currentCriteria!}
                            skisDatabase={skisDatabase}
                            isRowExpanded={isCardExpandedInRow('alternatywy', idx)}
                            onRowToggle={() => toggleCardInRow('alternatywy')}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  {groupedResults.alternatywy.length > 8 && (
                    <button
                      onClick={() => toggleCategory('alternatywy')}
                      className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                    >
                      {expandedCategories.alternatywy ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.alternatywy.length - 8})`}
                    </button>
                  )}
                </div>
              )}

              {/* Kategoria: INNA PŁEĆ */}
              {groupedResults && groupedResults.inna_plec.length > 0 && (
                <div>
                  <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                    👤 INNA PŁEĆ ({groupedResults.inna_plec.length})
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {(expandedCategories.inna_plec ? groupedResults.inna_plec : groupedResults.inna_plec.slice(0, 8)).map((match, idx) => (
                        <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-blue-500/20 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col items-center space-y-1">
                              <SkiStyleBadge 
                                przeznaczenie={match.ski.PRZEZNACZENIE}
                                atuty={match.ski.ATUTY}
                              />
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                {match.ski.DLUGOSC}cm
                              </div>
                            </div>
                            
                            <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                              <div className="font-black text-base">
                                {formatBrandName(match.ski)} {formatModelName(match.ski)}
                              </div>
                              <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                KOD: {match.ski.KOD}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                <span className={`${
                                  match.compatibility >= 90 ? 'text-green-400' :
                                  match.compatibility >= 70 ? 'text-yellow-400' :
                                  match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {match.compatibility}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <DetailedCompatibility 
                            match={match}
                            userCriteria={currentCriteria!}
                            skisDatabase={skisDatabase}
                            isRowExpanded={isCardExpandedInRow('inna_plec', idx)}
                            onRowToggle={() => toggleCardInRow('inna_plec')}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  {groupedResults.inna_plec.length > 8 && (
                    <button
                      onClick={() => toggleCategory('inna_plec')}
                      className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                    >
                      {expandedCategories.inna_plec ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.inna_plec.length - 8})`}
                    </button>
                  )}
                </div>
              )}

              {/* Kategoria: POZIOM ZA NISKO */}
              {groupedResults && groupedResults.poziom_za_nisko.length > 0 && (
                <div>
                  <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                    📉 POZIOM ZA NISKO ({groupedResults.poziom_za_nisko.length})
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {(expandedCategories.poziom_za_nisko ? groupedResults.poziom_za_nisko : groupedResults.poziom_za_nisko.slice(0, 8)).map((match, idx) => (
                        <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-orange-500/20 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col items-center space-y-1">
                              <SkiStyleBadge 
                                przeznaczenie={match.ski.PRZEZNACZENIE}
                                atuty={match.ski.ATUTY}
                              />
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                {match.ski.DLUGOSC}cm
                              </div>
                            </div>
                            
                            <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                              <div className="font-black text-base">
                                {formatBrandName(match.ski)} {formatModelName(match.ski)}
                              </div>
                              <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                KOD: {match.ski.KOD}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                <span className={`${
                                  match.compatibility >= 90 ? 'text-green-400' :
                                  match.compatibility >= 70 ? 'text-yellow-400' :
                                  match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {match.compatibility}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <DetailedCompatibility 
                            match={match}
                            userCriteria={currentCriteria!}
                            skisDatabase={skisDatabase}
                            isRowExpanded={isCardExpandedInRow('poziom_za_nisko', idx)}
                            onRowToggle={() => toggleCardInRow('poziom_za_nisko')}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  {groupedResults.poziom_za_nisko.length > 8 && (
                    <button
                      onClick={() => toggleCategory('poziom_za_nisko')}
                      className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                    >
                      {expandedCategories.poziom_za_nisko ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.poziom_za_nisko.length - 8})`}
                    </button>
                  )}
                </div>
              )}

              {/* Kategoria: NA SIŁĘ */}
              {groupedResults && groupedResults.na_sile.length > 0 && (
                <div>
                  <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                    💪 NA SIŁĘ ({groupedResults.na_sile.length})
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {(expandedCategories.na_sile ? groupedResults.na_sile : groupedResults.na_sile.slice(0, 8)).map((match, idx) => (
                        <motion.div key={match.ski.KOD + '-' + idx} variants={itemVariants} className="bg-red-500/20 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col items-center space-y-1">
                              <SkiStyleBadge 
                                przeznaczenie={match.ski.PRZEZNACZENIE}
                                atuty={match.ski.ATUTY}
                              />
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded border border-gray-400 shadow-sm">
                                {match.ski.DLUGOSC}cm
                              </div>
                            </div>
                            
                            <div className="text-white text-center flex-1 flex flex-col items-center justify-center">
                              <div className="font-black text-base">
                                {formatBrandName(match.ski)} {formatModelName(match.ski)}
                              </div>
                              <div className="text-xs text-gray-900 font-semibold mt-1 bg-gray-200 px-2 py-0.5 rounded">
                                KOD: {match.ski.KOD}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-12 px-2 py-1 bg-gray-600 text-white text-lg font-bold rounded border border-gray-400 shadow-sm">
                                <span className={`${
                                  match.compatibility >= 90 ? 'text-green-400' :
                                  match.compatibility >= 70 ? 'text-yellow-400' :
                                  match.compatibility >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {match.compatibility}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <DetailedCompatibility 
                            match={match}
                            userCriteria={currentCriteria!}
                            skisDatabase={skisDatabase}
                            isRowExpanded={isCardExpandedInRow('na_sile', idx)}
                            onRowToggle={() => toggleCardInRow('na_sile')}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  {groupedResults.na_sile.length > 8 && (
                    <button
                      onClick={() => toggleCategory('na_sile')}
                      className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-['Inter'] transition-colors"
                    >
                      {expandedCategories.na_sile ? '▲ Pokaż mniej' : `▼ Pokaż więcej (${groupedResults.na_sile.length - 8})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
