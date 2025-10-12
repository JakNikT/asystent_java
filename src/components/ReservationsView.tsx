import React, { useState, useEffect } from 'react';
import { ReservationService, type ReservationData } from '../services/reservationService';
import { Toast } from './Toast';

interface ReservationsViewProps {
  onBackToSearch: () => void;
}

// Interface dla pogrupowanej rezerwacji
interface GroupedReservation {
  klient: string;
  od: string;
  do: string;
  items: {
    category: string; // NARTY, BUTY, KIJKI
    equipment: string; // Full equipment name
    kod: string; // Equipment code
  }[];
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onBackToSearch }) => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'od' | 'klient'>('od');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState({
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    isVisible: false
  });

  // Funkcja do wczytywania/odświeżania rezerwacji
    const loadReservations = async () => {
      setIsLoading(true);
      try {
        const data = await ReservationService.loadReservations();
      console.log('ReservationsView: Wczytano', data.length, 'rezerwacji (tylko pierwsze 5 kolumn)');
        console.log('ReservationsView: Przykładowe dane:', data.slice(0, 3));
        setReservations(data);
      } catch (error) {
        console.error('Błąd wczytywania rezerwacji:', error);
      setToast({
        message: 'Błąd wczytywania pliku rez.csv',
        type: 'error',
        isVisible: true
      });
      } finally {
        setIsLoading(false);
      }
    };

  // Ustaw callbacki dla toastów konwersji
  useEffect(() => {
    ReservationService.onConversionStart = () => {
      console.log('ReservationsView: Rozpoczynam konwersję FireFnow');
      setToast({
        message: '🔄 Wykryto plik z FireFnow - konwersja...',
        type: 'info',
        isVisible: true
      });
    };

    ReservationService.onConversionComplete = () => {
      console.log('ReservationsView: Konwersja FireFnow zakończona');
      setToast({
        message: '✅ Dane skonwertowane i wczytane!',
        type: 'success',
        isVisible: true
      });
    };

    return () => {
      // Cleanup
      ReservationService.onConversionStart = null;
      ReservationService.onConversionComplete = null;
    };
  }, []);

  useEffect(() => {
    loadReservations();
  }, []);

  // Helper function to determine equipment category
  const getEquipmentCategory = (sprzet: string): string => {
    if (!sprzet) return 'INNE';
    const lower = sprzet.toLowerCase();
    if (lower.includes('narty') || lower.includes('deska')) return 'NARTY';
    if (lower.includes('buty') || lower.includes('but')) return 'BUTY';
    if (lower.includes('kijki') || lower.includes('kask') || lower.includes('wiązania')) return 'AKCESORIA';
    return 'INNE';
  };

  // Group reservations by client + date range
  const groupReservations = (): GroupedReservation[] => {
    const grouped = new Map<string, GroupedReservation>();

    reservations.forEach(res => {
      const key = `${res.klient}_${res.od}_${res.do}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          klient: res.klient,
          od: res.od,
          do: res.do,
          items: []
        });
      }

      const group = grouped.get(key)!;
      group.items.push({
        category: getEquipmentCategory(res.sprzet),
        equipment: res.sprzet,
        kod: res.kod || '-'
      });
    });

    return Array.from(grouped.values());
  };

  // Filter grouped reservations
  const filteredGroupedReservations = groupReservations().filter(group => {
    if (!filterText) return true;
    const searchTerm = filterText.toLowerCase();
    return (
      group.klient?.toLowerCase().includes(searchTerm) ||
      group.items.some(item => 
        item.equipment?.toLowerCase().includes(searchTerm) ||
        item.kod?.toLowerCase().includes(searchTerm)
      )
    );
  });

  // Sortowanie zgrupowanych rezerwacji
  const sortedGroupedReservations = [...filteredGroupedReservations].sort((a, b) => {
    let aValue: string | number = a[sortField];
    let bValue: string | number = b[sortField];

    if (sortField === 'od') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate total unique reservations
  const totalUniqueReservations = groupReservations().length;

  // Funkcja formatowania daty
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Toggle kategorii sprzętu
  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  // Rozwiń wszystkie kategorie w danym wierszu
  const expandAllCategoriesInRow = (rowKey: string, categoryGroups: Map<string, GroupedReservation['items']>) => {
    const newExpanded = new Set(expandedCategories);
    Array.from(categoryGroups.keys()).forEach(category => {
      const categoryKey = `${rowKey}_${category}`;
      newExpanded.add(categoryKey);
    });
    setExpandedCategories(newExpanded);
  };

  // Zwiń wszystkie kategorie w danym wierszu
  const collapseAllCategoriesInRow = (rowKey: string, categoryGroups: Map<string, GroupedReservation['items']>) => {
    const newExpanded = new Set(expandedCategories);
    Array.from(categoryGroups.keys()).forEach(category => {
      const categoryKey = `${rowKey}_${category}`;
      newExpanded.delete(categoryKey);
    });
    setExpandedCategories(newExpanded);
  };

  // Group equipment items by category
  const groupByCategory = (items: GroupedReservation['items']) => {
    const categoryMap = new Map<string, typeof items>();
    items.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category)!.push(item);
    });
    return categoryMap;
  };

  // Funkcja przełączania sortowania
  const handleSort = (field: 'od' | 'klient') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ikona sortowania
  const renderSortIcon = (field: 'od' | 'klient') => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return sortDirection === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  return (
    <div className="min-h-screen bg-[#386BB2] p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-[#194576] rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🔄 Rezerwacje
              </h1>
              <p className="text-[#A6C2EF]">
                Liczba unikalnych rezerwacji: <strong>{totalUniqueReservations}</strong> 
                {filterText && ` (wyświetlono: ${sortedGroupedReservations.length})`}
              </p>
              <p className="text-[#A6C2EF] text-sm mt-1">
                Kliknij kategorię sprzętu aby zobaczyć szczegóły
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBackToSearch}
                className="bg-[#2C699F] hover:bg-[#194576] text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
              ← Wróć do wyszukiwania
            </button>
            </div>
          </div>

          {/* Wyszukiwanie */}
          <div className="flex items-center gap-4">
            <label className="text-white font-medium text-lg">
              🔍 Szukaj:
            </label>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Wpisz klienta, sprzęt lub kod..."
              className="flex-1 px-4 py-2 bg-[#2C699F] text-white placeholder-[#A6C2EF] rounded-lg border border-[#A6C2EF] focus:outline-none focus:border-white"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Tabela rezerwacji */}
        {isLoading ? (
          <div className="text-center text-white text-xl py-20">
            Ładowanie rezerwacji...
          </div>
        ) : sortedGroupedReservations.length === 0 ? (
          <div className="bg-[#194576] rounded-lg shadow-lg p-12 text-center">
            <span className="text-white text-xl">
              {filterText ? '😔 Nie znaleziono rezerwacji pasujących do wyszukiwania' : '📋 Brak rezerwacji w systemie'}
            </span>
          </div>
        ) : (
          <div className="bg-[#194576] rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2C699F]">
                  <tr>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576] w-20"
                      onClick={() => handleSort('od')}
                    >
                      <div className="flex items-center gap-1">
                        Data od {renderSortIcon('od')}
                      </div>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-20">
                      Data do
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576] w-32"
                      onClick={() => handleSort('klient')}
                    >
                      <div className="flex items-center gap-1">
                        Klient {renderSortIcon('klient')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Sprzęt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#A6C2EF] divide-y divide-[#2C699F]">
                  {sortedGroupedReservations.map((group, idx) => {
                    const rowKey = `${group.klient}_${group.od}_${group.do}_${idx}`;
                    const categoryGroups = groupByCategory(group.items);

                    return (
                      <React.Fragment key={rowKey}>
                        <tr className="hover:bg-[#8BAED8] transition-colors">
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-[#194576] font-bold w-20">
                            {formatDate(group.od)}
                        </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-[#194576] font-bold w-20">
                            {formatDate(group.do)}
                        </td>
                        <td className="px-2 py-4 text-sm text-[#194576] font-medium w-32">
                            {group.klient || '-'}
                        </td>
                          <td className="px-4 py-4 text-sm text-[#194576]">
                            <div className="flex items-start gap-2">
                              {/* Mały trójkącik do rozwijania/zwijania wszystkich */}
                              <button
                                onClick={() => {
                                  const hasExpandedCategories = Array.from(categoryGroups.keys()).some(category => {
                                    const categoryKey = `${rowKey}_${category}`;
                                    return expandedCategories.has(categoryKey);
                                  });
                                  
                                  if (hasExpandedCategories) {
                                    collapseAllCategoriesInRow(rowKey, categoryGroups);
                                  } else {
                                    expandAllCategoriesInRow(rowKey, categoryGroups);
                                  }
                                }}
                                className="bg-[#2C699F] hover:bg-[#194576] text-white px-2 py-1 rounded text-xs font-bold text-center transition-colors duration-200 flex items-center justify-center gap-1 flex-shrink-0"
                                title="Rozwiń/zwij wszystkie kategorie"
                              >
                                <span className="text-sm">
                                  {Array.from(categoryGroups.keys()).some(category => {
                                    const categoryKey = `${rowKey}_${category}`;
                                    return expandedCategories.has(categoryKey);
                                  }) ? '▼' : '▶'}
                                </span>
                              </button>
                              
                              {/* Kategorie sprzętu */}
                              <div className="flex flex-wrap gap-2">
                                {Array.from(categoryGroups.keys()).map(category => {
                                const categoryItems = categoryGroups.get(category) || [];
                                const categoryKey = `${rowKey}_${category}`;
                                const isExpanded = expandedCategories.has(categoryKey);
                                
                                return (
                                  <div key={category} className="flex flex-col gap-1">
                                    {/* Kategoria jako klikalny nagłówek */}
                                    <button
                                      onClick={() => toggleCategory(categoryKey)}
                                      className="bg-[#2C699F] hover:bg-[#194576] text-white px-2 py-1 rounded text-xs font-bold text-center transition-colors duration-200 flex items-center justify-center gap-1"
                                    >
                                      <span>{isExpanded ? '▼' : '▶'}</span>
                                      <span>{category} ({categoryItems.length})</span>
                                    </button>
                                    
                                    {/* Lista sprzętu w kategorii - pokazuje się tylko gdy rozwinięta */}
                                    {isExpanded && (
                                      <div className="space-y-1 animate-fade-in max-w-full">
                                        {categoryItems.map((item, itemIdx) => {
                                          return (
                                            <div 
                                              key={itemIdx} 
                                              className="text-xs text-[#194576] bg-white/70 rounded p-2 border border-[#2C699F]/30 w-full max-w-full"
                                            >
                                              <div className="font-medium break-words" title={item.equipment}>
                                                {item.equipment}
                                              </div>
                                              <div className="text-gray-600 font-mono text-[10px] mt-1">
                                                Kod: {item.kod}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              </div>
                          </div>
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statystyki - Unikalne rezerwacje */}
        {!isLoading && totalUniqueReservations > 0 && (
          <div className="mt-6 bg-[#194576] rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">📊 Statystyki</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#2C699F] rounded-lg p-4">
                <div className="text-[#A6C2EF] text-sm font-bold mb-1">Łączna liczba unikalnych rezerwacji</div>
                <div className="text-white text-3xl font-bold">{totalUniqueReservations}</div>
                <div className="text-[#A6C2EF] text-xs mt-1">
                  (ta sama osoba + te same daty = 1 rezerwacja)
                </div>
              </div>
              <div className="bg-[#2C699F] rounded-lg p-4">
                <div className="text-[#A6C2EF] text-sm font-bold mb-1">Łączna liczba pozycji sprzętu</div>
                <div className="text-white text-3xl font-bold">{reservations.length}</div>
                <div className="text-[#A6C2EF] text-xs mt-1">
                  (wszystkie narty, buty, kijki, akcesoria)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

