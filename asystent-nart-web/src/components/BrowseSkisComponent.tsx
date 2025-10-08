import React, { useState, useEffect } from 'react';
import { CSVParser } from '../utils/csvParser';
import type { SkiData } from '../types/ski.types';

interface BrowseSkisComponentProps {
  skisDatabase: SkiData[];
  onBackToSearch: () => void;
}

type SortField = 'ID' | 'MARKA' | 'MODEL' | 'DLUGOSC' | 'POZIOM' | 'PLEC' | 'ILOSC' | 'ROK';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const BrowseSkisComponent: React.FC<BrowseSkisComponentProps> = ({ 
  skisDatabase, 
  onBackToSearch 
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'ID',
    direction: 'asc'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // NOWY STAN: Wyszukiwanie tekstowe
  const [searchTerm, setSearchTerm] = useState('');

  // Funkcja filtrowania nart
  const filterSkis = (skis: SkiData[], searchTerm: string): SkiData[] => {
    if (!searchTerm.trim()) return skis;
    
    const term = searchTerm.toLowerCase();
    return skis.filter(ski => 
      ski.MARKA.toLowerCase().includes(term) ||
      ski.MODEL.toLowerCase().includes(term) ||
      ski.POZIOM.toLowerCase().includes(term) ||
      ski.PLEC.toLowerCase().includes(term) ||
      ski.PRZEZNACZENIE.toLowerCase().includes(term) ||
      ski.ATUTY.toLowerCase().includes(term) ||
      ski.UWAGI.toLowerCase().includes(term) ||
      ski.DLUGOSC.toString().includes(term) ||
      ski.ROK.toString().includes(term) ||
      ski.ILOSC.toString().includes(term)
    );
  };

  // Funkcja sortowania nart
  const sortSkis = (skis: SkiData[], config: SortConfig): SkiData[] => {
    return [...skis].sort((a, b) => {
      let aValue: any = a[config.field];
      let bValue: any = b[config.field];

      // Konwersja dla pól numerycznych
      if (config.field === 'ID' || config.field === 'DLUGOSC' || config.field === 'ILOSC' || config.field === 'ROK') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      // Konwersja dla pól tekstowych
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Obsługa kliknięcia w nagłówek kolumny
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sortowanie i paginacja
  const filteredSkis = filterSkis(skisDatabase, searchTerm);
  const sortedSkis = sortSkis(filteredSkis, sortConfig);
  const totalPages = Math.ceil(sortedSkis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSkis = sortedSkis.slice(startIndex, endIndex);

  // Funkcja renderowania ikony sortowania
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  // Funkcja formatowania poziomu
  const formatLevel = (level: string) => {
    return level.replace(/(\d+)([MK])/g, '$1$2 ').trim();
  };

  // Funkcja formatowania płci
  const formatGender = (gender: string) => {
    switch (gender) {
      case 'M': return 'Mężczyzna';
      case 'K': return 'Kobieta';
      case 'U': return 'Uniwersalne';
      default: return gender;
    }
  };

  // Funkcja formatowania przeznaczenia
  const formatPurpose = (purpose: string) => {
    switch (purpose) {
      case 'SL': return 'Slalom';
      case 'G': return 'Gigant';
      case 'SLG': return 'Pomiędzy';
      case 'OFF': return 'Poza trasę';
      default: return purpose;
    }
  };

  return (
    <div className="min-h-screen bg-[#386BB2] p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header z wyszukiwaniem */}
        <div className="bg-[#194576] rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Przeglądaj narty
              </h1>
              <p className="text-[#A6C2EF]">
                Przejrzyj wszystkie narty w bazie danych ({skisDatabase.length} nart)
              </p>
            </div>
            <button
              onClick={onBackToSearch}
              className="bg-[#2C699F] hover:bg-[#194576] text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              ← Wróć do wyszukiwania
            </button>
          </div>
          
          {/* Pole wyszukiwania */}
          <div className="flex items-center gap-4">
            <label className="text-white font-medium text-lg">
              🔍 Wyszukaj narty:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset do pierwszej strony przy wyszukiwaniu
              }}
              placeholder="Wpisz markę, model, poziom, płeć..."
              className="flex-1 px-4 py-2 bg-[#2C699F] text-white placeholder-[#A6C2EF] rounded-lg border border-[#A6C2EF] focus:outline-none focus:border-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Wyczyść
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-3 text-[#A6C2EF]">
              Znaleziono {filteredSkis.length} nart z {skisDatabase.length} dostępnych
            </div>
          )}
        </div>

        {/* Tabela nart */}
        <div className="bg-[#194576] rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2C699F]">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('ID')}
                  >
                    <div className="flex items-center gap-2">
                      ID {renderSortIcon('ID')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('MARKA')}
                  >
                    <div className="flex items-center gap-2">
                      Marka {renderSortIcon('MARKA')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('MODEL')}
                  >
                    <div className="flex items-center gap-2">
                      Model {renderSortIcon('MODEL')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('DLUGOSC')}
                  >
                    <div className="flex items-center gap-2">
                      Długość {renderSortIcon('DLUGOSC')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('POZIOM')}
                  >
                    <div className="flex items-center gap-2">
                      Poziom {renderSortIcon('POZIOM')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('PLEC')}
                  >
                    <div className="flex items-center gap-2">
                      Płeć {renderSortIcon('PLEC')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('ILOSC')}
                  >
                    <div className="flex items-center gap-2">
                      Dostępność {renderSortIcon('ILOSC')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('ROK')}
                  >
                    <div className="flex items-center gap-2">
                      Rok {renderSortIcon('ROK')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Przeznaczenie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Atuty
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#A6C2EF] divide-y divide-[#2C699F]">
                {currentSkis.map((ski) => (
                  <tr key={ski.ID} className="hover:bg-[#2C699F]">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#194576]">
                      {ski.ID}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.MARKA}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.MODEL}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.DLUGOSC} cm
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {formatLevel(ski.POZIOM)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {formatGender(ski.PLEC)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ski.ILOSC > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ski.ILOSC > 0 ? `🟩 ${ski.ILOSC}` : '🔴 0'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.ROK}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {formatPurpose(ski.PRZEZNACZENIE)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.ATUTY || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginacja */}
          {totalPages > 1 && (
            <div className="bg-[#2C699F] px-4 py-3 flex items-center justify-between border-t border-[#194576] sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-[#194576] text-sm font-medium rounded-md text-white bg-[#2C699F] hover:bg-[#194576] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Poprzednia
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-[#194576] text-sm font-medium rounded-md text-white bg-[#2C699F] hover:bg-[#194576] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Następna
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-white">
                    Pokazuję <span className="font-medium">{startIndex + 1}</span> do{' '}
                    <span className="font-medium">{Math.min(endIndex, sortedSkis.length)}</span> z{' '}
                    <span className="font-medium">{sortedSkis.length}</span> wyników
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#194576] bg-[#2C699F] text-sm font-medium text-white hover:bg-[#194576] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    
                    {/* Numery stron */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-[#194576] border-[#194576] text-white'
                              : 'bg-[#2C699F] border-[#194576] text-white hover:bg-[#194576]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#194576] bg-[#2C699F] text-sm font-medium text-white hover:bg-[#194576] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informacje o sortowaniu */}
        <div className="mt-4 text-sm text-white">
          <p>
            Sortowanie: <span className="font-medium">{sortConfig.field}</span> (
            {sortConfig.direction === 'asc' ? 'rosnąco' : 'malejąco'})
          </p>
        </div>
      </div>
    </div>
  );
};
