import React, { useState, useEffect, useRef } from 'react';
import { ReservationApiClient } from '../services/reservationApiClient';
import type { ReservationData } from '../services/reservationService';
import { createLogger } from '../utils/logger';
import { EquipmentHandoutView } from './EquipmentHandoutView';

// src/components/ReservationsView.tsx: Logger dla ReservationsView
const logger = createLogger('ReservationsView');

interface ReservationsViewProps {
  onBackToSearch: () => void;
}

// Mapowanie ID grup na kategorie sprzętu
const EQUIPMENT_CATEGORIES: Record<number, string> = {
  82291: 'narty',  // Narty
  85528: 'narty',  // Narty
  82737: 'buty',   // Buty narciarskie
  37758: 'kije',   // Kije
  38528: 'kask',   // Kask
  38533: 'kask',   // Kask
  83762: 'deska',  // Deska snowboardowa
  85813: 'deska',  // Deska snowboardowa
  85811: 'wiazania', // Wiązania
  83760: 'buty_sb', // Buty SB (snowboardowe)
  84312: 'ski_mojo' // SKI mojo
};

// Interface dla pogrupowanej rezerwacji
interface GroupedReservation {
  klient: string;
  od: string;
  do: string;
  typumowy: string; // Typ umowy: "PROMOTOR" lub "STANDARD"
  source?: 'reservation' | 'rental'; // Źródło danych: rezerwacja lub wypożyczenie
  komplety: EquipmentSet[]; // Zachować komplety dla kolorowania
  sprzet_w_kategoriach: {
    narty: string[];
    buty: string[];
    kije: string[];
    kask: string[];
    deska: string[];
    wiazania: string[];
    buty_sb: string[];
    ski_mojo: string[];
  };
}

// Interface dla pozycji sprzętu w komplecie
interface EquipmentItem {
  category: string;
  equipment: string;
  kod: string;
}

// Interface dla kompletu sprzętu
interface EquipmentSet {
  id: number;
  items: EquipmentItem[];
  color: string; // Kolor tła dla kompletu
  icon: string; // Ikona kompletu (🎿, 🏂, 📦)
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onBackToSearch }) => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'od' | 'klient'>('od');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [showPromotorOnly, setShowPromotorOnly] = useState(false);
  // src/components/ReservationsView.tsx: Domyślny widok ustawiony na 'handout' (Wydania) - najpopularniejsza funkcja
  const [viewType, setViewType] = useState<'all' | 'reservations' | 'rentals' | 'past' | 'handout'>('handout');
  // src/components/ReservationsView.tsx: Stany dla filtrowania po dacie - wyniki pokazują się dopiero po wpisaniu daty od
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // src/components/ReservationsView.tsx: Stany dla debounce - wyszukiwanie rozpocznie się po zakończeniu wpisywania daty
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const dateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Funkcja do wczytywania/odświeżania danych (rezerwacje i/lub wypożyczenia)
  // src/components/ReservationsView.tsx: Nie akceptuje typu 'handout' - ten widok ma własne ładowanie
  const loadReservations = async (type: 'all' | 'reservations' | 'rentals' | 'past') => {
      // Dla widoku "przeszłe" - wczytuj tylko jeśli jest co najmniej 3 znaki w wyszukiwarce
      if (type === 'past' && filterText.trim().length < 3) {
        logger.debug('ReservationsView: Widok "przeszłe" wymaga co najmniej 3 znaków w wyszukiwarce');
        setReservations([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // src/components/ReservationsView.tsx: ReservationApiClient metody nie rzucają błędów
        // Wszystkie metody (loadAll, loadReservations, loadRentals, loadPastReservations, loadPastRentals)
        // mają wewnętrzne try/catch które obsługują błędy, wyświetlają toasty i zwracają puste tablice lub cache
        // Dlatego nie potrzebujemy tutaj bloku catch - błędy są już obsłużone w API client
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
          
          logger.info(`Znaleziono ${pastReservations.length} przeszłych rezerwacji + ${pastRentals.length} zwróconych wypożyczeń`);
          logger.info(`Połączono ${usedRentalIndices.size} par rezerwacja+wypożyczenie`);
        } else {
          // Pobierz tylko rezerwacje
          data = await ReservationApiClient.loadReservations();
        }
        
        logger.info(`Wczytano ${data.length} pozycji (typ: ${type})`);
        logger.debug('Przykładowe dane:', data.slice(0, 3));
        setReservations(data);
      } finally {
        // Zawsze wyłącz loading, nawet jeśli wystąpił nieoczekiwany błąd
        // (choć API client metody nie rzucają błędów, try/finally zapewnia bezpieczeństwo)
        setIsLoading(false);
      }
    };

  // USUNIĘTO: Callbacki konwersji - ReservationApiClient obsługuje to po stronie serwera
  // Konwersja z FireSnow jest teraz obsługiwana przez API serwera, nie po stronie klienta

  // Wczytaj dane gdy zmienia się typ widoku (nie dla "handout" - ten widok ma własne ładowanie)
  useEffect(() => {
    if (viewType === 'handout') {
      // Dla widoku wydania - wczytaj wszystkie aktywne rezerwacje
      loadReservations('reservations');
    } else {
      loadReservations(viewType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // src/components/ReservationsView.tsx: Debounce dla pól daty - wyszukiwanie rozpocznie się 500ms po zakończeniu wpisywania
  useEffect(() => {
    // Wyczyść poprzedni timer jeśli istnieje
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
    }
    
    // Ustaw nowy timer - wyszukiwanie rozpocznie się po 500ms od ostatniej zmiany
    dateDebounceRef.current = setTimeout(() => {
      setDateFromFilter(dateFrom);
      setDateToFilter(dateTo);
      logger.debug('ReservationsView: Zastosowano filtry daty (debounce)', { dateFrom, dateTo });
    }, 500);
    
    // Cleanup - wyczyść timer przy unmount lub zmianie wartości
    return () => {
      if (dateDebounceRef.current) {
        clearTimeout(dateDebounceRef.current);
      }
    };
  }, [dateFrom, dateTo]);

  // Helper function to determine equipment category based on parent_group_id
  const getEquipmentCategory = (parentGroupId: number | null | undefined, sprzet?: string): string => {
    // Najpierw spróbuj użyć parent_group_id
    if (parentGroupId) {
      const category = EQUIPMENT_CATEGORIES[parentGroupId];
      if (category) return category;
    }
    
    // Fallback: użyj nazwy sprzętu jeśli parent_group_id nie jest dostępne
    if (sprzet) {
      const lower = sprzet.toLowerCase();
      if (lower.includes('narty')) return 'narty';
      if (lower.includes('buty') && !lower.includes('sb') && !lower.includes('snowboard')) return 'buty';
      if (lower.includes('buty') && (lower.includes('sb') || lower.includes('snowboard'))) return 'buty_sb';
      if (lower.includes('kij')) return 'kije';
      if (lower.includes('kask')) return 'kask';
      if (lower.includes('deska')) return 'deska';
      if (lower.includes('wiązania') || lower.includes('wiazania')) return 'wiazania';
      if (lower.includes('mojo')) return 'ski_mojo';
    }
    
    return 'inne';
  };

  // Helper function to render equipment list as separate cells
  const renderEquipmentList = (items: string[]): React.ReactElement => {
    if (items.length === 0) {
      return <span className="text-white/50">-</span>;
    }
    
    return (
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white h-[48px] flex items-center"
          >
            {item}
          </div>
        ))}
      </div>
    );
  };

  // Określa ikonę dla kompletu na podstawie zawartości
  const getSetIcon = (items: EquipmentItem[]): string => {
    const hasNarty = items.some(item => item.equipment.toLowerCase().includes('narty'));
    const hasDeska = items.some(item => item.equipment.toLowerCase().includes('deska'));
    
    if (hasNarty) return '🎿';
    if (hasDeska) return '🏂';
    return '📦'; // Dla niekompletnych zestawów
  };

  // Rozpoznawanie kompletów sprzętu
  const detectEquipmentSets = (items: EquipmentItem[]): EquipmentSet[] => {
    const sets: EquipmentSet[] = [];
    const colors = ['bg-blue-50', 'bg-gray-50', 'bg-green-50'];
    let currentSet: EquipmentItem[] = [];
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

  // Group reservations by client + date range
  const groupReservations = (): GroupedReservation[] => {
    // Debug: sprawdź pierwsze 3 rezerwacje
    if (reservations.length > 0) {
      logger.debug('Przykładowe dane rezerwacji:', reservations.slice(0, 3).map(r => ({
        sprzet: r.sprzet,
        parent_group_id: r.parent_group_id,
        category: getEquipmentCategory(r.parent_group_id, r.sprzet)
      })));
    }
    
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
          komplety: [],
          sprzet_w_kategoriach: {
            narty: [],
            buty: [],
            kije: [],
            kask: [],
            deska: [],
            wiazania: [],
            buty_sb: [],
            ski_mojo: []
          }
        });
      }

      const group = grouped.get(key)!;
      const category = getEquipmentCategory(res.parent_group_id, res.sprzet);
      
      // Dodaj sprzęt do odpowiedniej kategorii (zachowując kolejność z umowy)
      if (category !== 'inne' && res.sprzet && !res.sprzet.toLowerCase().includes('promotor')) {
        const categoryKey = category as keyof typeof group.sprzet_w_kategoriach;
        if (group.sprzet_w_kategoriach[categoryKey]) {
          group.sprzet_w_kategoriach[categoryKey].push(res.sprzet);
        }
      }
    });

    // Po zgrupowaniu wszystkich rezerwacji, wykryj komplety dla każdej grupy
    grouped.forEach((group, key) => {
      const groupReservations = reservations.filter(
        r => {
          const normalizedKlient = r.klient.trim().replace(/\s+/g, ' ').toUpperCase();
          const resKey = `${normalizedKlient}_${r.od}_${r.do}`;
          return resKey === key;
        }
      );
      
      const items = groupReservations
        .filter(r => r.sprzet && !r.sprzet.toLowerCase().includes('promotor'))
        .map(r => ({
          category: getEquipmentCategory(r.parent_group_id, r.sprzet),
          equipment: r.sprzet,
          kod: r.kod || '-'
        }));
      
      group.komplety = detectEquipmentSets(items);
    });

    return Array.from(grouped.values());
  };

  // Filter grouped reservations
  const filteredGroupedReservations = groupReservations().filter(group => {
    // src/components/ReservationsView.tsx: Filtrowanie po dacie od - wyniki pokazują się dopiero po wpisaniu daty od (używamy dateFromFilter z debounce)
    // Jeśli nie ma daty od, nie pokazuj żadnych wyników
    if (!dateFromFilter) {
      return false;
    }
    
    // src/components/ReservationsView.tsx: Filtrowanie po dacie od - jeśli tylko data od, pokaż tylko umowy z tego dnia
    // Jeśli jest data do, pokaż umowy z zakresu [dateFrom, dateTo]
    const reservationDate = new Date(group.od);
    const fromDate = new Date(dateFromFilter);
    fromDate.setHours(0, 0, 0, 0); // Ustaw na początek dnia
    const fromDateEnd = new Date(dateFromFilter);
    fromDateEnd.setHours(23, 59, 59, 999); // Ustaw na koniec dnia
    
    // Jeśli podano datę do, sprawdź zakres dat
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // Ustaw na koniec dnia
      
      // Data od rezerwacji musi być w zakresie [dateFrom, dateTo]
      if (reservationDate < fromDate || reservationDate > toDate) {
        return false;
      }
    } else {
      // Jeśli nie ma daty do, pokaż TYLKO umowy z dokładnie tego dnia (dateFrom)
      reservationDate.setHours(0, 0, 0, 0);
      if (reservationDate.getTime() !== fromDate.getTime()) {
        return false;
      }
    }
    
    // Filtruj według checkbox PROMOTOR
    if (showPromotorOnly && group.typumowy !== 'PROMOTOR') {
      return false;
    }
    
    // Filtruj według tekstu wyszukiwania
    if (!filterText) return true;
    const searchTerm = filterText.toLowerCase();
    
    // Sprawdź wszystkie kategorie sprzętu
    const allEquipment = [
      ...group.sprzet_w_kategoriach.narty,
      ...group.sprzet_w_kategoriach.buty,
      ...group.sprzet_w_kategoriach.kije,
      ...group.sprzet_w_kategoriach.kask,
      ...group.sprzet_w_kategoriach.deska,
      ...group.sprzet_w_kategoriach.wiazania,
      ...group.sprzet_w_kategoriach.buty_sb,
      ...group.sprzet_w_kategoriach.ski_mojo
    ];
    
    return (
      group.klient?.toLowerCase().includes(searchTerm) ||
      allEquipment.some(equipment => 
        equipment?.toLowerCase().includes(searchTerm)
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
  logger.debug('📊 Debug liczników:');
  logger.debug('   Liczba rezerwacji:', totalReservations);
  logger.debug('   Liczba unikalnych klientów (raw):', uniqueClients);
  
  // Znajdź klientów z wieloma rezerwacjami
  const clientCounts = new Map<string, number>();
  clientNames.forEach(name => {
    clientCounts.set(name, (clientCounts.get(name) || 0) + 1);
  });
  const multipleReservations = Array.from(clientCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
    
  logger.debug('   Klienci z wieloma rezerwacjami:', multipleReservations.length);
  logger.debug('   Szczegóły:', multipleReservations.slice(0, 10));

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
    <div 
      className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-3 lg:p-6"
      style={{
        backgroundImage: "url('/images/background.png')",
      }}
    >
      {/* Overlay dla lepszej czytelności */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-8xl mx-auto">
        {/* Header - responsywny */}
        <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4">
            <div className="w-full lg:w-auto">
              {/* Przyciski filtrowania - zastępują napis "Rezerwacje" */}
              <div className="flex flex-wrap gap-3 mb-4">
                {/* Przycisk "Wszystko" wyłączony na żądanie użytkownika */}
                {/* <button
                  onClick={() => setViewType('all')}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm ${
                    viewType === 'all'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  📋 Wszystko
                </button> */}
                <button
                  onClick={() => setViewType('handout')}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm ${
                    viewType === 'handout'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  📦 Wydania
                </button>
                <button
                  onClick={() => setViewType('reservations')}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm ${
                    viewType === 'reservations'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  📅 Rezerwacje
                </button>
                <button
                  onClick={() => setViewType('rentals')}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm ${
                    viewType === 'rentals'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  🎿 Wypożyczenia
                </button>
                <button
                  onClick={() => setViewType('past')}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm ${
                    viewType === 'past'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  🕒 Przeszłe
                </button>
              </div>
              
              {/* Pola do wpisywania daty od i do - ukryj dla widoku "Wydania" */}
              {viewType !== 'handout' && (
                <>
                  <div className="flex flex-wrap items-center gap-4 mb-4 bg-[#0f2744]/30 px-4 py-3 rounded-lg border border-white/5">
                    <label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 whitespace-nowrap">
                      📅 Data od:
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-4 py-2 bg-primary text-white rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm"
                    />
                    <label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 whitespace-nowrap">
                      📅 Data do:
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-4 py-2 bg-primary text-white rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm"
                    />
                    {(dateFrom || dateTo) && (
                      <button
                        onClick={() => {
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm border border-white/10 whitespace-nowrap"
                      >
                        Wyczyść daty
                      </button>
                    )}
                  </div>
                  
                  {/* Komunikat informujący o konieczności wpisania daty */}
                  {!dateFromFilter && (
                    <div className="bg-yellow-600/30 border border-yellow-500 rounded-lg p-3 mb-4">
                      <p className="text-yellow-200 text-sm font-medium">
                        ⚠️ Wpisz <strong>datę od</strong>, aby zobaczyć wyniki. Filtrowanie odbywa się po kolumnie "Data od".
                        <br />
                        <span className="text-xs opacity-90 mt-1 block">
                          Tylko data od = umowy z tego dnia | Data od + do = umowy z zakresu dat
                        </span>
                      </p>
                    </div>
                  )}
                  {dateFromFilter && !dateToFilter && (
                    <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-3 mb-4">
                      <p className="text-blue-200 text-sm font-medium">
                        ℹ️ Wyświetlane są tylko umowy z dnia <strong>{dateFromFilter}</strong>. Wpisz datę "do", aby zobaczyć umowy z zakresu dat.
                      </p>
                    </div>
                  )}
                  {dateFrom && !dateFromFilter && (
                    <div className="bg-gray-600/30 border border-gray-500 rounded-lg p-2 mb-4">
                      <p className="text-gray-200 text-xs font-medium">
                        ⏳ Wpisywanie daty... Wyszukiwanie rozpocznie się automatycznie po zakończeniu.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm lg:text-base">
                      📋 Liczba pozycji: <strong className="text-white">{totalReservations}</strong>
                      {filterText && ` (wyświetlono: ${sortedGroupedReservations.length})`}
                    </p>
                    <p className="text-white/70 text-sm lg:text-base">
                      👥 Liczba unikalnych klientów: <strong className="text-white">{uniqueClients}</strong> 
                      <span className="text-xs ml-2">(porównaj z FireFnow)</span>
                    </p>
                    <p className="text-white/60 text-xs lg:text-sm mt-1">
                      🎿 Sprzęt pogrupowany w komplety - kliknij "Rozwiń wszystkie komplety" aby zobaczyć szczegóły
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <button
                onClick={onBackToSearch}
                className="bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white px-6 py-3 rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 justify-center"
              >
                ← Wróć do wyszukiwania
              </button>
            </div>
          </div>

          {/* Wyszukiwanie - responsywne - ukryj dla widoku "Wydania" */}
          {viewType !== 'handout' && (
            <div className="space-y-3">
              {/* Wyszukiwarka - responsywna */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <label className="text-white font-bold text-sm uppercase tracking-wider opacity-90">
                  🔍 Szukaj:
                </label>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={viewType === 'past' 
                    ? "Wpisz co najmniej 3 znaki aby wyszukać przeszłe rezerwacje..." 
                    : "Wpisz klienta, sprzęt lub kod..."}
                  className="flex-1 px-4 py-2 bg-primary text-white placeholder-white/30 rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm"
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm border border-white/10"
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
              <div className="flex items-center gap-3 bg-[#0f2744]/50 px-4 py-2 rounded-lg border border-white/5 w-fit shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-bold uppercase tracking-wider">
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
          )}
        </div>

        {/* Warunkowe renderowanie: Widok wydania lub tabela rezerwacji */}
        {viewType === 'handout' ? (
          <EquipmentHandoutView 
            reservations={reservations}
            onBack={() => setViewType('reservations')}
          />
        ) : (
          <>
            {/* Tabela rezerwacji */}
            {isLoading ? (
          <div className="text-center text-white text-xl py-20">
            Ładowanie rezerwacji...
          </div>
        ) : !dateFromFilter ? (
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
            <span className="text-white text-xl font-medium">
              📅 Wpisz <strong>datę od</strong>, aby zobaczyć wyniki. Filtrowanie odbywa się po kolumnie "Data od".
            </span>
          </div>
        ) : viewType === 'past' && filterText.trim().length < 3 ? (
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
            <span className="text-white text-xl font-medium">
              🔍 Wpisz co najmniej 3 znaki w wyszukiwarce, aby wczytać przeszłe rezerwacje
            </span>
          </div>
        ) : sortedGroupedReservations.length === 0 ? (
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
            <span className="text-white text-xl font-medium">
              {filterText ? '😔 Nie znaleziono rezerwacji pasujących do wyszukiwania' : '📋 Brak rezerwacji w wybranym zakresie dat'}
            </span>
          </div>
        ) : (
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f2744]/50 border-b border-white/10">
                  <tr>
                    <th 
                      className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 w-20 transition-colors"
                      onClick={() => handleSort('od')}
                    >
                      <div className="flex items-center gap-1">
                        Data od {renderSortIcon('od')}
                      </div>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider w-20">
                      Data do
                    </th>
                    <th 
                      className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 w-32 transition-colors"
                      onClick={() => handleSort('klient')}
                    >
                      <div className="flex items-center gap-1">
                        Klient {renderSortIcon('klient')}
                      </div>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[120px]">
                      Narty
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[120px]">
                      Buty
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                      Kije
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                      Kask
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[120px]">
                      Deska
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                      Wiązania
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                      Buty SB
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                      SKI mojo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/5 divide-y divide-white/10">
                  {sortedGroupedReservations.map((group, idx) => {
                    const rowKey = `${group.klient}_${group.od}_${group.do}_${idx}`;
                    const equipmentSets = group.komplety;
                    
                    // Funkcja do określenia koloru tła komórki na podstawie kompletu
                    const getCellBackgroundColor = (category: string): string => {
                      // Znajdź do którego kompletu należy sprzęt z tej kategorii
                      const categoryItems = group.sprzet_w_kategoriach[category as keyof typeof group.sprzet_w_kategoriach] || [];
                      if (categoryItems.length === 0) return '';
                      
                      // Znajdź pierwszy komplet zawierający sprzęt z tej kategorii
                      for (let i = 0; i < equipmentSets.length; i++) {
                        const set = equipmentSets[i];
                        const hasCategoryItem = set.items.some(item => {
                          const reservation = reservations.find(r => 
                            r.klient.trim() === group.klient && 
                            r.od === group.od && 
                            r.do === group.do &&
                            r.sprzet === item.equipment
                          );
                          const itemCategory = getEquipmentCategory(reservation?.parent_group_id, reservation?.sprzet);
                          return itemCategory === category;
                        });
                        if (hasCategoryItem) {
                          // Użyj koloru kompletu, ale z większą przezroczystością dla lepszej czytelności
                          const colorMap: Record<string, string> = {
                            'bg-blue-50': 'bg-blue-100/30',
                            'bg-gray-50': 'bg-gray-100/30',
                            'bg-green-50': 'bg-green-100/30'
                          };
                          return colorMap[set.color] || '';
                        }
                      }
                      return '';
                    };

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
                          </div>
                        </td>
                        
                        {/* Kolumny sprzętu */}
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('narty')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.narty)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('buty')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.buty)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('kije')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.kije)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('kask')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.kask)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('deska')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.deska)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('wiazania')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.wiazania)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('buty_sb')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.buty_sb)}
                        </td>
                        <td className={`px-2 py-4 text-sm text-white align-top ${getCellBackgroundColor('ski_mojo')}`}>
                          {renderEquipmentList(group.sprzet_w_kategoriach.ski_mojo)}
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
              <div className="mt-6 bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">📊 Statystyki</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0f2744]/50 rounded-lg border border-white/5 p-4 shadow-sm">
                    <div className="text-white/70 text-sm font-bold mb-1 uppercase tracking-wider">Łączna liczba rezerwacji</div>
                    <div className="text-white text-3xl font-bold">{totalReservations}</div>
                    <div className="text-white/60 text-xs mt-1">
                      (ta sama osoba + te same daty = 1 rezerwacja)
                    </div>
                  </div>
                  <div className="bg-[#0f2744]/50 rounded-lg border border-white/5 p-4 shadow-sm">
                    <div className="text-white/70 text-sm font-bold mb-1 uppercase tracking-wider">Łączna liczba pozycji sprzętu</div>
                    <div className="text-white text-3xl font-bold">{reservations.length}</div>
                    <div className="text-white/60 text-xs mt-1">
                      (wszystkie narty, buty, kijki, akcesoria)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Toast notifications są teraz obsługiwane przez ToastProvider w App.tsx */}
    </div>
  );
};

