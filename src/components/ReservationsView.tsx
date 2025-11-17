import React, { useState, useEffect } from 'react';
import { ReservationApiClient } from '../services/reservationApiClient';
import type { ReservationData } from '../services/reservationService';
import { Toast } from './Toast';

interface ReservationsViewProps {
  onBackToSearch: () => void;
}

// Interface dla pogrupowanej rezerwacji
interface GroupedReservation {
  klient: string;
  od: string;
  do: string;
  typumowy: string; // Typ umowy: "PROMOTOR" lub "STANDARD"
  source?: 'reservation' | 'rental'; // Źródło danych: rezerwacja lub wypożyczenie
  items: {
    category: string; // NARTY, BUTY, KIJKI
    equipment: string; // Full equipment name
    kod: string; // Equipment code
  }[];
}

// Interface dla kompletu sprzętu
interface EquipmentSet {
  id: number;
  items: GroupedReservation['items'];
  color: string; // Kolor tła dla kompletu
  icon: string; // Ikona kompletu (🎿, 🏂, 📦)
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onBackToSearch }) => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'od' | 'klient'>('od');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [expandedReservations, setExpandedReservations] = useState<Set<string>>(new Set());
  const [showPromotorOnly, setShowPromotorOnly] = useState(false);
  const [viewType, setViewType] = useState<'all' | 'reservations' | 'rentals' | 'past'>('all');
  const [toast, setToast] = useState({
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    isVisible: false
  });

  // Funkcja do wczytywania/odświeżania danych (rezerwacje i/lub wypożyczenia)
    const loadReservations = async (type: 'all' | 'reservations' | 'rentals' | 'past' = viewType) => {
      // Dla widoku "przeszłe" - wczytuj tylko jeśli jest co najmniej 3 znaki w wyszukiwarce
      if (type === 'past' && filterText.trim().length < 3) {
        console.log('ReservationsView: Widok "przeszłe" wymaga co najmniej 3 znaków w wyszukiwarce');
        setReservations([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let data: ReservationData[];
        
        if (type === 'all') {
          // Pobierz wszystko (rezerwacje + wypożyczenia)
          data = await ReservationApiClient.loadAll();
        } else if (type === 'rentals') {
          // Pobierz tylko wypożyczenia
          data = await ReservationApiClient.loadRentals();
        } else if (type === 'past') {
          // Pobierz przeszłe rezerwacje + zwrócone wypożyczenia
          const [pastReservations, pastRentals] = await Promise.all([
            ReservationApiClient.loadPastReservations(),
            ReservationApiClient.loadPastRentals()
          ]);
          
          // Połącz rezerwacje z wypożyczeniami (merge logic)
          // Szukamy par: ta sama osoba + ten sam sprzęt/kod + daty blisko siebie (±3 dni)
          const merged: ReservationData[] = [];
          const usedRentalIndices = new Set<number>();
          
          pastReservations.forEach(reservation => {
            let matchedRental: ReservationData | null = null;
            let matchedIndex = -1;
            
            // Szukaj pasującego wypożyczenia
            for (let i = 0; i < pastRentals.length; i++) {
              if (usedRentalIndices.has(i)) continue; // Już użyte
              
              const rental = pastRentals[i];
              
              // Sprawdź czy pasują: ten sam klient i kod
              const sameClient = reservation.klient.trim().toLowerCase() === rental.klient.trim().toLowerCase();
              const sameEquipment = reservation.kod && rental.kod && reservation.kod === rental.kod;
              
              if (sameClient && sameEquipment) {
                // Sprawdź czy daty są blisko (±3 dni)
                const resStart = new Date(reservation.od);
                const rentStart = new Date(rental.od);
                const daysDiff = Math.abs((resStart.getTime() - rentStart.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysDiff <= 3) {
                  matchedRental = rental;
                  matchedIndex = i;
                  break;
                }
              }
            }
            
            if (matchedRental) {
              // Połącz rezerwację z wypożyczeniem - oznacz wizualnie
              merged.push({
                ...reservation,
                sprzet: `🔄 ${reservation.sprzet}`, // Dodaj ikonę cyklu (rezerwacja→wypożyczenie→zwrot)
                uwagi: (reservation.uwagi || '') + ` [Zwrócono: ${matchedRental.do}]`
              });
              usedRentalIndices.add(matchedIndex);
            } else {
              // Rezerwacja bez wypożyczenia
              merged.push(reservation);
            }
          });
          
          // Dodaj wypożyczenia które nie zostały połączone z rezerwacjami
          pastRentals.forEach((rental, index) => {
            if (!usedRentalIndices.has(index)) {
              merged.push(rental);
            }
          });
          
          data = merged;
          
          console.log(`ReservationsView: Znaleziono ${pastReservations.length} przeszłych rezerwacji + ${pastRentals.length} zwróconych wypożyczeń`);
          console.log(`ReservationsView: Połączono ${usedRentalIndices.size} par rezerwacja+wypożyczenie`);
        } else {
          // Pobierz tylko rezerwacje
          data = await ReservationApiClient.loadReservations();
        }
        
        console.log(`ReservationsView: Wczytano ${data.length} pozycji (typ: ${type})`);
        console.log('ReservationsView: Przykładowe dane:', data.slice(0, 3));
        setReservations(data);
      } catch (error) {
        console.error('Błąd wczytywania danych:', error);
        setToast({
          message: 'Błąd wczytywania danych',
          type: 'error',
          isVisible: true
        });
      } finally {
        setIsLoading(false);
      }
    };

  // USUNIĘTO: Callbacki konwersji - ReservationApiClient obsługuje to po stronie serwera
  // Konwersja z FireSnow jest teraz obsługiwana przez API serwera, nie po stronie klienta

  // Wczytaj dane gdy zmienia się typ widoku
  useEffect(() => {
    loadReservations(viewType);
  }, [viewType]);

  // Dla widoku "przeszłe" - wczytuj dane również gdy zmienia się filterText (tylko jeśli >= 3 znaki)
  useEffect(() => {
    if (viewType === 'past' && filterText.trim().length >= 3) {
      loadReservations('past');
    } else if (viewType === 'past' && filterText.trim().length < 3) {
      // Wyczyść dane jeśli użytkownik usunął znaki poniżej 3
      setReservations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterText, viewType]);

  // Helper function to determine equipment category
  const getEquipmentCategory = (sprzet: string): string => {
    if (!sprzet) return 'INNE';
    const lower = sprzet.toLowerCase();
    if (lower.includes('narty') || lower.includes('deska')) return 'NARTY/DESKI';
    if (lower.includes('buty') || lower.includes('but')) return 'BUTY';
    if (lower.includes('kijki')) return 'KIJKI';
    if (lower.includes('wiązania')) return 'WIĄZANIA';
    if (lower.includes('kask')) return 'KASKI';
    return 'INNE';
  };

  // Group reservations by client + date range
  const groupReservations = (): GroupedReservation[] => {
    const grouped = new Map<string, GroupedReservation>();

    reservations.forEach(res => {
      // Normalizuj nazwę klienta (usuń dodatkowe spacje, trim)
      const normalizedKlient = res.klient.trim().replace(/\s+/g, ' ').toUpperCase();
      const key = `${normalizedKlient}_${res.od}_${res.do}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          klient: res.klient.trim(), // Zachowaj oryginalną wielkość liter, ale trim
          od: res.od,
          do: res.do,
          typumowy: res.typumowy || 'STANDARD',
          source: res.source, // Zachowaj źródło danych (rezerwacja lub wypożyczenie)
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
    // Filtruj według checkbox PROMOTOR
    if (showPromotorOnly && group.typumowy !== 'PROMOTOR') {
      return false;
    }
    
    // Filtruj według tekstu wyszukiwania
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
  // Liczniki
  const allGroups = groupReservations();
  const totalReservations = allGroups.length; // Liczba wszystkich rezerwacji (90)
  
  // Liczba unikalnych klientów (jak w FireFnow)
  const clientNames = allGroups.map(g => g.klient);
  const uniqueClients = new Set(clientNames).size;
  
  // Debug: Sprawdź czy są duplikaty z różnymi spacjami/wielkością liter
  console.log('📊 Debug liczników:');
  console.log('   Liczba rezerwacji:', totalReservations);
  console.log('   Liczba unikalnych klientów (raw):', uniqueClients);
  
  // Znajdź klientów z wieloma rezerwacjami
  const clientCounts = new Map<string, number>();
  clientNames.forEach(name => {
    clientCounts.set(name, (clientCounts.get(name) || 0) + 1);
  });
  const multipleReservations = Array.from(clientCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
    
  console.log('   Klienci z wieloma rezerwacjami:', multipleReservations.length);
  console.log('   Szczegóły:', multipleReservations.slice(0, 10));

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

  // Toggle wszystkich kompletów w rezerwacji
  const toggleReservation = (reservationKey: string) => {
    const newExpanded = new Set(expandedReservations);
    if (newExpanded.has(reservationKey)) {
      newExpanded.delete(reservationKey);
    } else {
      newExpanded.add(reservationKey);
    }
    setExpandedReservations(newExpanded);
  };

  // Rozpoznawanie kompletów sprzętu
  const detectEquipmentSets = (items: GroupedReservation['items']): EquipmentSet[] => {
    const sets: EquipmentSet[] = [];
    const colors = ['bg-blue-50', 'bg-gray-50', 'bg-green-50'];
    let currentSet: typeof items = [];
    let setIndex = 0;
    
    // Filtruj elementy - usuń pozycje które nie są prawdziwym sprzętem
    const validItems = items.filter(item => {
      if (!item.equipment) return false;
      const equipmentLower = item.equipment.toLowerCase();
      
      // ZAWSZE ignoruj "PROMOTOR" - to tylko znacznik, nie sprzęt
      if (equipmentLower.includes('promotor')) return false;
      
      // Ignoruj także inne pozycje nietypowe
      if (equipmentLower.includes('suma:')) return false;
      if (equipmentLower.trim() === '') return false;
      
      return true;
    });
    
    validItems.forEach((item) => {
      const equipmentLower = item.equipment.toLowerCase();
      const isStartOfSet = 
        equipmentLower.includes('narty') ||
        equipmentLower.includes('deska');
      
      if (isStartOfSet && currentSet.length > 0) {
        // Zapisz poprzedni komplet
        const setIcon = getSetIcon(currentSet);
        sets.push({
          id: setIndex,
          items: currentSet,
          color: colors[setIndex % colors.length],
          icon: setIcon
        });
        setIndex++;
        currentSet = [item];
      } else {
        currentSet.push(item);
      }
    });
    
    // Dodaj ostatni komplet (tylko jeśli ma elementy)
    if (currentSet.length > 0) {
      const setIcon = getSetIcon(currentSet);
      sets.push({
        id: setIndex,
        items: currentSet,
        color: colors[setIndex % colors.length],
        icon: setIcon
      });
    }
    
    return sets;
  };

  // Określa ikonę dla kompletu na podstawie zawartości
  const getSetIcon = (items: GroupedReservation['items']): string => {
    const hasNarty = items.some(item => item.equipment.toLowerCase().includes('narty'));
    const hasDeska = items.some(item => item.equipment.toLowerCase().includes('deska'));
    
    if (hasNarty) return '🎿';
    if (hasDeska) return '🏂';
    return '📦'; // Dla niekompletnych zestawów
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
    <div className="min-h-screen bg-[#386BB2] p-3 lg:p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header - responsywny */}
        <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4">
            <div className="w-full lg:w-auto">
              {/* Przyciski filtrowania - zastępują napis "Rezerwacje" */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setViewType('all')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    viewType === 'all'
                      ? 'bg-white text-[#194576] shadow-lg'
                      : 'bg-[#2C699F] text-white hover:bg-[#1E4D75]'
                  }`}
                >
                  📋 Wszystko
                </button>
                <button
                  onClick={() => setViewType('reservations')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    viewType === 'reservations'
                      ? 'bg-white text-[#194576] shadow-lg'
                      : 'bg-[#2C699F] text-white hover:bg-[#1E4D75]'
                  }`}
                >
                  📅 Rezerwacje
                </button>
                <button
                  onClick={() => setViewType('rentals')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    viewType === 'rentals'
                      ? 'bg-white text-[#194576] shadow-lg'
                      : 'bg-[#2C699F] text-white hover:bg-[#1E4D75]'
                  }`}
                >
                  🎿 Wypożyczenia
                </button>
                <button
                  onClick={() => setViewType('past')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    viewType === 'past'
                      ? 'bg-white text-[#194576] shadow-lg'
                      : 'bg-[#2C699F] text-white hover:bg-[#1E4D75]'
                  }`}
                >
                  🕒 Przeszłe
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[#A6C2EF] text-sm lg:text-base">
                  📋 Liczba pozycji: <strong>{totalReservations}</strong>
                  {filterText && ` (wyświetlono: ${sortedGroupedReservations.length})`}
                </p>
                <p className="text-[#A6C2EF] text-sm lg:text-base">
                  👥 Liczba unikalnych klientów: <strong>{uniqueClients}</strong> 
                  <span className="text-xs ml-2">(porównaj z FireFnow)</span>
                </p>
                <p className="text-[#A6C2EF] text-xs lg:text-sm mt-1">
                  🎿 Sprzęt pogrupowany w komplety - kliknij "Rozwiń wszystkie komplety" aby zobaczyć szczegóły
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <button
                onClick={onBackToSearch}
                className="bg-[#2C699F] hover:bg-[#194576] text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 justify-center"
              >
                ← Wróć do wyszukiwania
              </button>
            </div>
          </div>

          {/* Wyszukiwanie - responsywne */}
          <div className="space-y-3">
            {/* Wyszukiwarka - responsywna */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <label className="text-white font-medium text-lg">
                🔍 Szukaj:
              </label>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={viewType === 'past' 
                  ? "Wpisz co najmniej 3 znaki aby wyszukać przeszłe rezerwacje..." 
                  : "Wpisz klienta, sprzęt lub kod..."}
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
            
            {/* Komunikat dla widoku "przeszłe" */}
            {viewType === 'past' && filterText.trim().length < 3 && (
              <div className="bg-yellow-600/30 border border-yellow-500 rounded-lg p-4">
                <p className="text-yellow-200 text-sm font-medium">
                  ⚠️ Wpisz co najmniej <strong>3 znaki</strong> w wyszukiwarce, aby wczytać przeszłe rezerwacje.
                  <br />
                  <span className="text-xs opacity-90 mt-1 block">
                    To pomaga uniknąć wczytywania zbyt dużej ilości danych na raz.
                  </span>
                </p>
              </div>
            )}
            
            {/* Checkbox PROMOTOR */}
            <div className="flex items-center gap-3 bg-[#2C699F] px-4 py-2 rounded-lg w-fit">
              <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showPromotorOnly}
                  onChange={(e) => setShowPromotorOnly(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span>📋 Pokaż tylko umowy PROMOTOR</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabela rezerwacji */}
        {isLoading ? (
          <div className="text-center text-white text-xl py-20">
            Ładowanie rezerwacji...
          </div>
        ) : viewType === 'past' && filterText.trim().length < 3 ? (
          <div className="bg-[#194576] rounded-lg shadow-lg p-12 text-center">
            <span className="text-white text-xl">
              🔍 Wpisz co najmniej 3 znaki w wyszukiwarce, aby wczytać przeszłe rezerwacje
            </span>
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
                    const equipmentSets = detectEquipmentSets(group.items);
                    const isReservationExpanded = expandedReservations.has(rowKey);

                    return (
                      <tr 
                        key={rowKey} 
                        className={`transition-colors ${
                          group.source === 'rental'
                            ? 'bg-[#3A7BAF] hover:bg-[#2E6A9A]'  // Wypożyczenia - jaśniejszy niebieski
                            : 'bg-[#2C5F8D] hover:bg-[#1A4A6F]'  // Rezerwacje - ciemniejszy niebieski
                        }`}
                      >
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-white font-bold w-20 align-top">
                          {formatDate(group.od)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-white font-bold w-20 align-top">
                          {formatDate(group.do)}
                        </td>
                        <td className="px-2 py-4 text-sm text-white font-medium w-32 align-top">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <span>{group.klient || '-'}</span>
                              {group.source === 'rental' && (
                                <span className="px-2 py-0.5 text-[10px] bg-yellow-500 text-white rounded font-bold whitespace-nowrap">
                                  WYPOŻYCZENIE
                                </span>
                              )}
                            </div>
                            {/* Mały przycisk do rozwijania wszystkich kompletów */}
                            <button
                              onClick={() => toggleReservation(rowKey)}
                              className="bg-[#2C699F] hover:bg-[#194576] text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1"
                            >
                              <span className="text-xs">{isReservationExpanded ? '▼' : '▶'}</span>
                              <span className="text-xs">
                                {isReservationExpanded ? 'Zwiń' : 'Rozwiń'}
                              </span>
                              <span className="text-[10px] opacity-80">({equipmentSets.length})</span>
                            </button>
                          </div>
                        </td>
                        
                        {/* Kolumna ze wszystkimi kompletami w poziomej siatce */}
                        <td className="px-4 py-4 text-sm text-[#194576]">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {equipmentSets.map((set) => {
                              return (
                                <div 
                                  key={set.id}
                                  className={`${set.color} rounded-lg p-3 border-2 border-[#2C699F]/20 shadow-sm`}
                                >
                                  {/* Nagłówek kompletu */}
                                  <div className="w-full bg-[#2C699F] text-white px-3 py-2 rounded text-xs font-bold text-left flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span>{set.icon}</span>
                                      <span>KOMPLET {set.id + 1}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] opacity-80">({set.items.length})</span>
                                      <span className="text-sm">{isReservationExpanded ? '▼' : '▶'}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Lista sprzętu w komplecie - pokazuje się tylko gdy rozwinięty */}
                                  {isReservationExpanded && (
                                    <div className="mt-2 space-y-1 animate-fade-in">
                                      {set.items.map((item, itemIdx) => (
                                        <div 
                                          key={itemIdx} 
                                          className="text-[10px] text-[#194576] bg-white/70 rounded p-2 border border-[#2C699F]/30"
                                        >
                                          <div className="font-medium break-words leading-tight" title={item.equipment}>
                                            {item.equipment}
                                          </div>
                                          <div className="text-gray-600 font-mono text-[9px] mt-1">
                                            {item.kod}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statystyki - Podsumowanie */}
        {!isLoading && totalReservations > 0 && (
          <div className="mt-6 bg-[#194576] rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">📊 Statystyki</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#2C699F] rounded-lg p-4">
                <div className="text-[#A6C2EF] text-sm font-bold mb-1">Łączna liczba rezerwacji</div>
                <div className="text-white text-3xl font-bold">{totalReservations}</div>
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

