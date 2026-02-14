import React, { useState, useEffect, useRef } from 'react';
import { ReservationApiClient } from '../services/reservationApiClient';
import type { ReservationData } from '../services/reservationService';
import { createLogger } from '../utils/logger';
import { EquipmentHandoutView } from './EquipmentHandoutView';
import { DatePickerButton } from './DatePickerButton';
import { loadAppState, saveAppState } from '../utils/localStorage';
import type { ViewType } from '../types/viewTypes';

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

// src/components/ReservationsView.tsx: Mapowanie ID grup na szczegółowe kategorie sprzętu dla statystyk zwrotów
const EQUIPMENT_DETAILED_CATEGORIES: Record<number, string> = {
  82293: 'narty_top',     // Narty TOP
  82412: 'narty_vip',     // Narty VIP
  82758: 'narty_junior',  // Narty JUNIOR
  82738: 'buty_dorosle',  // Buty narciarskie dorosłe
  82827: 'buty_junior',   // Buty narciarskie junior
  83762: 'deski',         // Deski snowboardowe
  83760: 'buty_sb',       // Buty snowboardowe
  // Fallback dla starych ID bez szczegółowej kategorii
  82291: 'narty_inne',    // Narty (bez kategorii)
  85528: 'narty_inne',    // Narty (bez kategorii)
  82737: 'buty_inne',     // Buty (bez kategorii)
};

// src/components/ReservationsView.tsx: Interface dla statystyk kategorii sprzętu w zwrotach (zwrócone/wszystkie)
interface CategoryReturnCount {
  returned: number;
  total: number;
}

interface EquipmentCategoryStats {
  narty_top: CategoryReturnCount;
  narty_vip: CategoryReturnCount;
  narty_junior: CategoryReturnCount;
  buty_dorosle: CategoryReturnCount;
  buty_junior: CategoryReturnCount;
  deski: CategoryReturnCount;
  buty_sb: CategoryReturnCount;
}

// Interface dla pogrupowanej rezerwacji
interface GroupedReservation {
  klient: string;
  od: string;
  do: string;
  typumowy: string; // Typ umowy: "PROMOTOR" lub "STANDARD"
  source?: 'reservation' | 'rental'; // Źródło danych: rezerwacja lub wypożyczenie
  komplety: EquipmentSet[]; // Zachować komplety dla kolorowania
  sprzet_w_kategoriach: {
    narty: Array<{ sprzet: string; kod: string }>;
    buty: Array<{ sprzet: string; kod: string }>;
    kije: Array<{ sprzet: string; kod: string }>;
    kask: Array<{ sprzet: string; kod: string }>;
    deska: Array<{ sprzet: string; kod: string }>;
    wiazania: Array<{ sprzet: string; kod: string }>;
    buty_sb: Array<{ sprzet: string; kod: string }>;
    ski_mojo: Array<{ sprzet: string; kod: string }>;
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
  // src/components/ReservationsView.tsx: Wczytaj stan z localStorage przy inicjalizacji
  const savedAppState = loadAppState();
  const savedReturnsState = savedAppState?.returnsState;
  const savedReservationsState = savedAppState?.reservationsState;
  // src/components/ReservationsView.tsx: Wczytaj showPromotorOnly z localStorage przy inicjalizacji
  const [showPromotorOnly, setShowPromotorOnly] = useState<boolean>(savedReservationsState?.showPromotorOnly || false);

  // src/components/ReservationsView.tsx: Inicjalizacja viewType z localStorage, żeby przywrócić ostatnio otwarty widok (np. "wydania")
  const [viewType, setViewType] = useState<ViewType>(() => {
    // Tylko przy odświeżeniu (nie przy pierwszym uruchomieniu) używaj zapisanego stanu
    const isFirstLaunch = !sessionStorage.getItem('app-initialized');
    if (isFirstLaunch) {
      // Pierwsze uruchomienie - użyj domyślnego widoku 'all'
      return 'all' as ViewType;
    } else {
      // Odświeżenie - przywróć zapisany stan
      const saved = savedAppState?.reservationsViewType;
      // Explicit type guard
      if (saved === 'all' || saved === 'reservations' || saved === 'rentals' || saved === 'past' ||
          saved === 'handout' || saved === 'returns' || saved === 'service' || saved === 'check') {
        return saved;
      }
      return 'handout' as ViewType;
    }
  });
  // src/components/ReservationsView.tsx: Stany dla filtrowania po dacie - wyniki pokazują się dopiero po wpisaniu daty od
  const [dateFrom, setDateFrom] = useState<string>(savedReservationsState?.dateFrom || '');
  const [dateTo, setDateTo] = useState<string>(savedReservationsState?.dateTo || '');
  // src/components/ReservationsView.tsx: Stany dla debounce - wyszukiwanie rozpocznie się po zakończeniu wpisywania daty
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const dateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // src/components/ReservationsView.tsx: Stany dla widoku zwrotów
  const [returnDate, setReturnDate] = useState<string>(savedReturnsState?.returnDate || '');
  const [returnsOnDate, setReturnsOnDate] = useState<CategoryReturnCount>({ returned: 0, total: 0 });
  const [returnsOverdue, setReturnsOverdue] = useState<CategoryReturnCount>({ returned: 0, total: 0 });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  // src/components/ReservationsView.tsx: Stany dla statystyk kategorii sprzętu w zwrotach
  const emptyStatsInit: EquipmentCategoryStats = {
    narty_top: { returned: 0, total: 0 },
    narty_vip: { returned: 0, total: 0 },
    narty_junior: { returned: 0, total: 0 },
    buty_dorosle: { returned: 0, total: 0 },
    buty_junior: { returned: 0, total: 0 },
    deski: { returned: 0, total: 0 },
    buty_sb: { returned: 0, total: 0 }
  };
  const [onDateStats, setOnDateStats] = useState<EquipmentCategoryStats>(emptyStatsInit);
  const [overdueStats, setOverdueStats] = useState<EquipmentCategoryStats>(emptyStatsInit);

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

  // src/components/ReservationsView.tsx: Funkcja do liczenia zwrotów dla wybranej daty
  // Zwraca liczbę zwróconych/wszystkich umów oraz statystyki sprzętu w formacie X/Y
  // LOGIKA: total = suma wszystkich umów (aktywne + zwrócone), returned = tylko zwrócone
  // Dzięki temu postęp zmienia się z 70/70 → 69/70 → 68/70 (nie 70/70 → 69/69)
  const countReturnsForDate = async (selectedDate: string): Promise<{
    onDate: CategoryReturnCount;
    overdue: CategoryReturnCount;
    onDateStats: EquipmentCategoryStats;
    overdueStats: EquipmentCategoryStats;
  }> => {
    // Inicjalizacja pustych statystyk z formatem returned/total
    const emptyCount: CategoryReturnCount = { returned: 0, total: 0 };
    const emptyStats: EquipmentCategoryStats = {
      narty_top: { returned: 0, total: 0 },
      narty_vip: { returned: 0, total: 0 },
      narty_junior: { returned: 0, total: 0 },
      buty_dorosle: { returned: 0, total: 0 },
      buty_junior: { returned: 0, total: 0 },
      deski: { returned: 0, total: 0 },
      buty_sb: { returned: 0, total: 0 }
    };

    if (!selectedDate) {
      return { onDate: emptyCount, overdue: emptyCount, onDateStats: emptyStats, overdueStats: emptyStats };
    }

    try {
      logger.debug('ReservationsView: Liczenie zwrotów dla daty', selectedDate);

      // Pobierz aktywne wypożyczenia (jeszcze nie zwrócone) i przeszłe (już zwrócone)
      const [activeData, pastData] = await Promise.all([
        ReservationApiClient.loadAll(),
        ReservationApiClient.loadPastRentals()
      ]);

      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);

      // Helper do grupowania umów po kliencie + dacie
      const groupByContract = (data: ReservationData[]) => {
        const grouped = new Map<string, { klient: string; od: string; do: string }>();
        data.forEach(res => {
          const normalizedKlient = res.klient.trim().replace(/\s+/g, ' ').toUpperCase();
          const key = `${normalizedKlient}_${res.od}_${res.do}`;
          if (!grouped.has(key)) {
            grouped.set(key, { klient: res.klient.trim(), od: res.od, do: res.do });
          }
        });
        return grouped;
      };

      const activeGrouped = groupByContract(activeData);
      const pastGrouped = groupByContract(pastData);

      // Filtr: umowy kończące się danego dnia
      const filterOnDate = (group: { do: string }) => {
        const endDate = new Date(group.do);
        endDate.setHours(0, 0, 0, 0);
        return endDate.getTime() === selectedDateObj.getTime();
      };

      // Filtr: umowy zaległe (data do < wybrana data)
      const filterOverdue = (group: { do: string }) => {
        const endDate = new Date(group.do);
        endDate.setHours(23, 59, 59, 999);
        return endDate < selectedDateObj;
      };

      // LICZNIK UMÓW NA DZIEŃ
      // total = suma WSZYSTKICH umów (aktywne + zwrócone) - liczba się NIE zmienia
      // returned = liczba JUŻ zwróconych - rośnie gdy ktoś zwróci sprzęt
      // Wyświetlenie: (total - returned)/total czyli np. 69/70, 68/70, ..., 0/70
      const activeOnDate = Array.from(activeGrouped.values()).filter(filterOnDate).length;
      const pastOnDate = Array.from(pastGrouped.values()).filter(filterOnDate).length;
      const onDateCount: CategoryReturnCount = {
        returned: pastOnDate,  // JUŻ zwrócone
        total: activeOnDate + pastOnDate  // WSZYSTKIE umowy kończące się tego dnia (stała liczba)
      };

      // LICZNIK UMÓW ZALEGŁYCH
      // total = suma WSZYSTKICH zaległych umów (aktywne + zwrócone) - liczba się NIE zmienia
      // returned = liczba JUŻ zwróconych - rośnie gdy ktoś zwróci zaległe
      const activeOverdue = Array.from(activeGrouped.values()).filter(filterOverdue).length;
      const pastOverdue = Array.from(pastGrouped.values()).filter(filterOverdue).length;
      const overdueCount: CategoryReturnCount = {
        returned: pastOverdue,  // JUŻ zwrócone (z zaległych)
        total: activeOverdue + pastOverdue  // WSZYSTKIE zaległe umowy (stała liczba)
      };

      // Inicjalizacja statystyk kategorii sprzętu
      const onDateStats: EquipmentCategoryStats = JSON.parse(JSON.stringify(emptyStats));
      const overdueStats: EquipmentCategoryStats = JSON.parse(JSON.stringify(emptyStats));

      // Helper do zliczania sprzętu
      const countEquipment = (data: ReservationData[], isReturned: boolean) => {
        data.forEach(res => {
          if (!res.sprzet || res.sprzet.toLowerCase().includes('promotor')) return;

          const endDate = new Date(res.do);
          endDate.setHours(0, 0, 0, 0);
          const endDateWithTime = new Date(res.do);
          endDateWithTime.setHours(23, 59, 59, 999);

          if (res.parent_group_id && EQUIPMENT_DETAILED_CATEGORIES[res.parent_group_id]) {
            const category = EQUIPMENT_DETAILED_CATEGORIES[res.parent_group_id] as keyof EquipmentCategoryStats;

            if (category in onDateStats && !['narty_inne', 'buty_inne'].includes(category)) {
              if (endDate.getTime() === selectedDateObj.getTime()) {
                onDateStats[category].total++;
                if (isReturned) onDateStats[category].returned++;
              } else if (endDateWithTime < selectedDateObj) {
                overdueStats[category].total++;
                if (isReturned) overdueStats[category].returned++;
              }
            }
          }
        });
      };

      // Zlicz sprzęt z aktywnych (nie zwrócone) i przeszłych (zwrócone)
      countEquipment(activeData, false);
      countEquipment(pastData, true);

      const result = {
        onDate: onDateCount,
        overdue: overdueCount,
        onDateStats,
        overdueStats
      };

      logger.info('ReservationsView: Liczniki zwrotów', result);
      return result;
    } catch (error) {
      logger.error('ReservationsView: Błąd liczenia zwrotów', error);
      const emptyCount: CategoryReturnCount = { returned: 0, total: 0 };
      return { onDate: emptyCount, overdue: emptyCount, onDateStats: emptyStats, overdueStats: emptyStats };
    }
  };

  // src/components/ReservationsView.tsx: Funkcja odświeżania liczników zwrotów
  const refreshReturnsCount = async () => {
    if (!returnDate) return;

    setIsRefreshing(true);
    try {
      // Wyczyść cache aby pobrać świeże dane
      ReservationApiClient.clearCache();

      // Przelicz liczniki i statystyki
      const result = await countReturnsForDate(returnDate);
      setReturnsOnDate(result.onDate);
      setReturnsOverdue(result.overdue);
      setOnDateStats(result.onDateStats);
      setOverdueStats(result.overdueStats);

      logger.info('ReservationsView: Odświeżono liczniki zwrotów', result);
    } catch (error) {
      logger.error('ReservationsView: Błąd odświeżania liczników zwrotów', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Automatycznie zapisuj viewType do LocalStorage przy każdej zmianie
  useEffect(() => {
    logger.info(`src/components/ReservationsView.tsx: Auto-zapisywanie viewType do LocalStorage: ${viewType}`);
    saveAppState('reservations', viewType);
  }, [viewType]);

  // Automatycznie zapisuj returnDate do LocalStorage przy każdej zmianie (tylko dla widoku zwrotów)
  useEffect(() => {
    if (viewType === 'returns') {
      const returnsState = {
        returnDate
      };

      logger.info('ReservationsView: Auto-zapisywanie stanu widoku zwroty do LocalStorage');
      saveAppState('reservations', 'returns', undefined, returnsState);
    }
  }, [returnDate, viewType]);

  // Automatycznie zapisuj stan widoku rezerwacje do localStorage przy każdej zmianie (tylko dla widoku rezerwacje)
  useEffect(() => {
    if (viewType === 'reservations') {
      const reservationsState = {
        dateFrom,
        dateTo,
        showPromotorOnly
      };

      logger.info('ReservationsView: Auto-zapisywanie stanu widoku rezerwacje do LocalStorage');
      saveAppState('reservations', 'reservations', undefined, undefined, reservationsState);
    }
  }, [dateFrom, dateTo, showPromotorOnly, viewType]);

  // Wczytaj dane gdy zmienia się typ widoku (nie dla "handout", "service", "check" i "returns" - te widoki mają własne ładowanie)
  useEffect(() => {
    if (viewType === 'handout' || viewType === 'service' || viewType === 'check') {
      // Dla widoku wydania, serwis i sprawdź - wczytaj wszystkie aktywne rezerwacje
      loadReservations('reservations');
    } else if (viewType === 'returns') {
      // Dla widoku zwrotów - nie ładuj danych tutaj, countReturnsForDate robi to samodzielnie
      // Dane będą ładowane gdy użytkownik wybierze datę (w useEffect dla returnDate)
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

  // src/components/ReservationsView.tsx: Liczenie zwrotów gdy wybrana zostanie data
  useEffect(() => {
    if (viewType === 'returns' && returnDate) {
      countReturnsForDate(returnDate).then(result => {
        setReturnsOnDate(result.onDate);
        setReturnsOverdue(result.overdue);
        setOnDateStats(result.onDateStats);
        setOverdueStats(result.overdueStats);
      });
    } else if (viewType === 'returns' && !returnDate) {
      // Wyczyść liczniki i statystyki gdy nie ma daty
      const emptyCount: CategoryReturnCount = { returned: 0, total: 0 };
      const emptyStats: EquipmentCategoryStats = {
        narty_top: { returned: 0, total: 0 },
        narty_vip: { returned: 0, total: 0 },
        narty_junior: { returned: 0, total: 0 },
        buty_dorosle: { returned: 0, total: 0 },
        buty_junior: { returned: 0, total: 0 },
        deski: { returned: 0, total: 0 },
        buty_sb: { returned: 0, total: 0 }
      };
      setReturnsOnDate(emptyCount);
      setReturnsOverdue(emptyCount);
      setOnDateStats(emptyStats);
      setOverdueStats(emptyStats);
    }
  }, [returnDate, viewType]);

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

  // src/components/ReservationsView.tsx: Funkcja usuwająca prefiks typu sprzętu z nazwy (np. "BUTY " z "BUTY HEAD EDGE...")
  const removeCategoryPrefix = (equipmentName: string, category: string): string => {
    if (!equipmentName) return equipmentName;

    const prefixes: Record<string, string[]> = {
      'narty': ['NARTY', 'NARTY ', 'NARTY  '],
      'buty': ['BUTY', 'BUTY ', 'BUTY  '],
      'buty_sb': ['BUTY SB', 'BUTY SB ', 'BUTY_SB', 'BUTY_SB '],
      'kije': ['KIJKI', 'KIJKI ', 'KIJKI  ', 'KIJ', 'KIJ '],
      'kask': ['KASK', 'KASK ', 'KASKI', 'KASKI '],
      'deska': ['DESKA', 'DESKA ', 'DESKI', 'DESKI ', 'SNOWBOARD', 'SNOWBOARD '],
      'wiazania': ['WIĄZANIA', 'WIĄZANIA ', 'WIAZANIA', 'WIAZANIA ', 'WIĄZANIE', 'WIĄZANIE '],
      'ski_mojo': ['SKI MOJO', 'SKI MOJO ', 'SKI_MOJO', 'SKI_MOJO ']
    };

    const categoryPrefixes = prefixes[category] || [];
    let cleanedName = equipmentName.trim();

    // Usuń prefiksy (case-insensitive)
    for (const prefix of categoryPrefixes) {
      const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
      cleanedName = cleanedName.replace(regex, '').trim();
    }

    return cleanedName || equipmentName; // Jeśli wszystko zostało usunięte, zwróć oryginalną nazwę
  };

  // Helper function to render equipment list as separate cells
  const renderEquipmentList = (items: Array<{ sprzet: string; kod: string }>, category: string): React.ReactElement => {
    if (items.length === 0) {
      return <span className="text-white/50">-</span>;
    }

    return (
      <div className="flex flex-col gap-2 h-full justify-center">
        {items.map((item, idx) => {
          const cleanedName = removeCategoryPrefix(item.sprzet, category);
          return (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white min-h-[48px] flex flex-col items-center justify-center break-words overflow-hidden"
            >
              <span className="text-[10px] text-white/70 font-semibold mb-0.5">{item.kod}</span>
              <span className="break-words text-center">{cleanedName}</span>
            </div>
          );
        })}
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
  // src/components/ReservationsView.tsx: Funkcja wykrywania czy umowa jest PROMOTOR
  // Sprawdza 3 miejsca: numer umowy, pozycja sprzętu "PROMOTOR", dokładnie literka "p" w uwagach
  const isPromotorContract = (_group: GroupedReservation, allReservationsForGroup: ReservationData[]): boolean => {
    // 1. Sprawdź numer umowy - PROMOTOR ma "P" zamiast "RE"
    // Pobierz numer z pierwszej rezerwacji w grupie (wszystkie mają ten sam numer)
    if (allReservationsForGroup.length > 0) {
      const numer = allReservationsForGroup[0].numer || '';
      // Sprawdź czy numer zaczyna się od "P" (nie "RE")
      if (numer.trim().toUpperCase().startsWith('P') && !numer.trim().toUpperCase().startsWith('RE')) {
        logger.debug('ReservationsView: Wykryto PROMOTOR po numerze umowy:', numer);
        return true;
      }
    }

    // 2. Sprawdź czy w umowie jest pozycja sprzętu o nazwie "PROMOTOR"
    const hasPromotorEquipment = allReservationsForGroup.some(res =>
      res.sprzet && res.sprzet.trim().toUpperCase() === 'PROMOTOR'
    );
    if (hasPromotorEquipment) {
      logger.debug('ReservationsView: Wykryto PROMOTOR po pozycji sprzętu "PROMOTOR"');
      return true;
    }

    // 3. Sprawdź czy w kolumnie "uwagi" jest dokładnie literka "p" (case-insensitive, po trim)
    const hasPromotorInUwagi = allReservationsForGroup.some(res => {
      if (!res.uwagi) return false;
      // Sprawdź czy uwagi to dokładnie "p" lub "P" (po trim)
      const uwagiTrimmed = res.uwagi.trim().toUpperCase();
      return uwagiTrimmed === 'P';
    });
    if (hasPromotorInUwagi) {
      logger.debug('ReservationsView: Wykryto PROMOTOR po dokładnej literce "p" w uwagach');
      return true;
    }

    return false;
  };

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
          typumowy: res.typumowy || 'STANDARD', // Tymczasowo, będzie nadpisane przez isPromotorContract
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
          } as GroupedReservation['sprzet_w_kategoriach']
        });
      }

      const group = grouped.get(key)!;
      const category = getEquipmentCategory(res.parent_group_id, res.sprzet);

      // Dodaj sprzęt do odpowiedniej kategorii (zachowując kolejność z umowy)
      if (category !== 'inne' && res.sprzet && !res.sprzet.toLowerCase().includes('promotor')) {
        const categoryKey = category as keyof typeof group.sprzet_w_kategoriach;
        if (group.sprzet_w_kategoriach[categoryKey]) {
          group.sprzet_w_kategoriach[categoryKey].push({
            sprzet: res.sprzet,
            kod: res.kod || '-'
          });
        }
      }
    });

    // Po zgrupowaniu wszystkich rezerwacji, sprawdź każdą grupę czy jest PROMOTOR i wykryj komplety
    grouped.forEach((group, key) => {
      const groupReservations = reservations.filter(
        r => {
          const normalizedKlient = r.klient.trim().replace(/\s+/g, ' ').toUpperCase();
          const resKey = `${normalizedKlient}_${r.od}_${r.do}`;
          return resKey === key;
        }
      );

      // Sprawdź czy umowa jest PROMOTOR używając wszystkich 3 miejsc
      const isPromotor = isPromotorContract(group, groupReservations);
      group.typumowy = isPromotor ? 'PROMOTOR' : 'STANDARD';

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
      ...group.sprzet_w_kategoriach.narty.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.buty.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.kije.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.kask.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.deska.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.wiazania.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.buty_sb.map(e => e.sprzet),
      ...group.sprzet_w_kategoriach.ski_mojo.map(e => e.sprzet)
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

  // src/components/ReservationsView.tsx: Funkcja renderowania statystyk kategorii sprzętu (format X/Y)
  // Wyświetla: (total - returned)/total, czyli pozostałe do zwrotu / wszystkie
  const renderCategoryStats = (stats: EquipmentCategoryStats) => {
    const categories = [
      { key: 'narty_top', label: 'Narty TOP', emoji: '🎿', color: 'bg-blue-600/80' },
      { key: 'narty_vip', label: 'Narty VIP', emoji: '🎿', color: 'bg-purple-600/80' },
      { key: 'narty_junior', label: 'Narty JUNIOR', emoji: '👶', color: 'bg-green-600/80' },
      { key: 'buty_dorosle', label: 'Buty dorosłe', emoji: '👢', color: 'bg-orange-600/80' },
      { key: 'buty_junior', label: 'Buty junior', emoji: '👟', color: 'bg-yellow-600/80' },
      { key: 'deski', label: 'Deski SB', emoji: '🏂', color: 'bg-cyan-600/80' },
      { key: 'buty_sb', label: 'Buty SB', emoji: '🥾', color: 'bg-teal-600/80' }
    ];

    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {categories.map(cat => {
          const countData = stats[cat.key as keyof EquipmentCategoryStats];
          if (countData.total === 0) return null; // Ukryj kategorie z zerowymi wartościami

          const isComplete = countData.returned === countData.total;
          const remaining = countData.total - countData.returned;

          return (
            <div
              key={cat.key}
              className={`${isComplete ? 'bg-green-600/80' : cat.color} text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 border border-white/20 shadow-sm`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}:</span>
              <span className="text-lg">{remaining}/{countData.total}</span>
              {isComplete && <span>✓</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // src/components/ReservationsView.tsx: Funkcja pomocnicza do renderowania widoku zwrotów
  const renderReturnsView = () => (
      <div
        className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-4 lg:p-6"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Overlay dla lepszej czytelności */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {!returnDate ? (
            // STAN 1: Wybór daty
            <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-6 lg:p-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 text-center">
                🔄 Zwroty Sprzętu
              </h2>

              <div className="space-y-6">
                <DatePickerButton
                  label="Wybierz datę zwrotów"
                  icon="🔄"
                  value={returnDate}
                  onChange={setReturnDate}
                />

                <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-4">
                  <p className="text-blue-200 text-sm font-medium">
                    ℹ️ Wybierz datę, aby zobaczyć liczbę umów kończących się tego dnia oraz zaległe zwroty.
                  </p>
                </div>

                <button
                  onClick={() => setViewType('reservations')}
                  className="w-full py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
                >
                  ← Powrót do rezerwacji
                </button>
              </div>
            </div>
          ) : (
            // STAN 2: Wyświetlenie liczników
            <div className="space-y-6">
              {/* Nagłówek sticky */}
              <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">
                    📅 Zwroty na dzień: {formatDate(returnDate)}
                  </h2>
                  <button
                    onClick={() => setReturnDate('')}
                    className="px-4 py-2 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-sm"
                  >
                    Zmień datę
                  </button>
                </div>
              </div>

              {/* Sekcja 1: Zwroty z wybranego dnia */}
              <div className={`rounded-xl border shadow-lg backdrop-blur-md p-6 lg:p-8 ${
                returnsOnDate.returned === returnsOnDate.total && returnsOnDate.total > 0
                  ? 'bg-green-500/30 border-green-400/50'
                  : 'bg-blue-500/30 border-blue-400/50'
              }`}>
                <div className="text-center">
                  <div className="text-white/70 text-sm lg:text-base font-bold uppercase tracking-wider mb-3">
                    {returnsOnDate.returned === returnsOnDate.total && returnsOnDate.total > 0
                      ? '✅ ZWROTY ZAKOŃCZONE'
                      : '🔵 ZWROTY Z TEGO DNIA'}
                  </div>
                  <div className="text-white text-6xl lg:text-8xl font-bold mb-3">
                    {returnsOnDate.total - returnsOnDate.returned}/{returnsOnDate.total}
                  </div>
                  <div className="text-white/80 text-base lg:text-lg">
                    {returnsOnDate.returned === returnsOnDate.total && returnsOnDate.total > 0
                      ? `wszystkie umowy z ${formatDate(returnDate)} zwrócone ✓`
                      : `pozostało do zwrotu z ${formatDate(returnDate)}`}
                  </div>

                  {/* Statystyki kategorii sprzętu */}
                  {renderCategoryStats(onDateStats)}
                </div>
              </div>

              {/* Sekcja 2: Zaległe zwroty */}
              <div className={`rounded-xl border shadow-lg backdrop-blur-md p-6 lg:p-8 ${
                returnsOverdue.total - returnsOverdue.returned > 0
                  ? 'bg-orange-500/30 border-orange-400/50'
                  : 'bg-green-500/30 border-green-400/50'
              }`}>
                <div className="text-center">
                  <div className="text-white/70 text-sm lg:text-base font-bold uppercase tracking-wider mb-3">
                    {returnsOverdue.total - returnsOverdue.returned > 0
                      ? '🟠 ZALEGŁE ZWROTY'
                      : '✅ BRAK ZALEGŁOŚCI'}
                  </div>
                  <div className="text-white text-6xl lg:text-8xl font-bold mb-3">
                    {returnsOverdue.total - returnsOverdue.returned}/{returnsOverdue.total}
                  </div>
                  <div className="text-white/80 text-base lg:text-lg">
                    {returnsOverdue.total - returnsOverdue.returned > 0
                      ? `${returnsOverdue.total - returnsOverdue.returned} zaległych umów czeka na zwrot`
                      : 'Wszystkie zaległe zwroty wykonane ✓'
                    }
                  </div>

                  {/* Statystyki kategorii sprzętu */}
                  {renderCategoryStats(overdueStats)}
                </div>
              </div>

              {/* Przyciski akcji */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={refreshReturnsCount}
                  disabled={isRefreshing}
                  className="flex-1 py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg flex items-center justify-center gap-2"
                >
                  {isRefreshing ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      Odświeżanie...
                    </>
                  ) : (
                    <>
                      🔄 Odśwież
                    </>
                  )}
                </button>
                <button
                  onClick={() => setViewType('reservations')}
                  className="flex-1 py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
                >
                  ← Powrót do rezerwacji
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

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
              {/* Przyciski nawigacji - responsywny grid dla mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2 lg:gap-3 mb-4">
                {/* Przycisk "Wszystko" wyłączony na żądanie użytkownika */}
                {/* <button
                  onClick={() => setViewType('all')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${
                    viewType === 'all'
                      ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                      : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                  }`}
                >
                  📋 Wszystko
                </button> */}
                <button
                  onClick={() => setViewType('handout')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'handout'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  📦 Wydaj
                </button>
                <button
                  onClick={() => setViewType('check')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'check'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  🔍 Sprawdź
                </button>
                <button
                  onClick={() => setViewType('service')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'service'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  🔧 Serwis
                </button>
                <button
                  onClick={() => setViewType('returns')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'returns'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  🔄 Zwroty
                </button>
                <button
                  onClick={() => setViewType('reservations')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'reservations'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  📅 Rezerwacje
                </button>
                <button
                  onClick={() => setViewType('rentals')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'rentals'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  🎿 Wypożyczenia
                </button>
                <button
                  onClick={() => setViewType('past')}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-sm lg:text-base ${viewType === 'past'
                    ? 'bg-white/90 text-primary shadow-lg border border-white/20'
                    : 'bg-[#0f2744]/50 text-white hover:bg-[#0f2744]/70 border border-white/5'
                    }`}
                >
                  🕒 Przeszłe
                </button>
              </div>

              {/* Pola do wpisywania daty od i do - ukryj dla widoków specjalnych: wydania, serwis, sprawdź */}
              {!['handout', 'service', 'check'].includes(viewType) && (
                <>
                  <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <DatePickerButton
                        label="Data od"
                        icon="📅"
                        value={dateFrom}
                        onChange={setDateFrom}
                        maxDate={dateTo || undefined}
                      />
                    </div>
                    <div className="flex-1">
                      <DatePickerButton
                        label="Data do"
                        icon="📅"
                        value={dateTo}
                        onChange={setDateTo}
                        minDate={dateFrom || undefined}
                      />
                    </div>
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="w-full lg:w-auto px-6 py-3 mb-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm border border-white/10"
                    >
                      🗑️ Wyczyść daty
                    </button>
                  )}

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
          {!['handout', 'service', 'check'].includes(viewType) && (
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

        {/* Warunkowe renderowanie: Widok wydania/serwis/sprawdź lub tabela rezerwacji */}
        {viewType === 'returns' ? (
          renderReturnsView()
        ) : viewType === 'handout' || viewType === 'service' || viewType === 'check' ? (
          <EquipmentHandoutView
            reservations={reservations}
            onBack={() => setViewType('reservations')}
            startInServiceMode={viewType === 'service'}
            startInCheckMode={viewType === 'check'}
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
                <div className="overflow-y-auto max-h-[calc(100vh-400px)] overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f2744]/90 border-b border-white/10 sticky top-0 z-10">
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
                            className={`transition-colors ${group.source === 'rental'
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
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('narty')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.narty, 'narty')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('buty')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.buty, 'buty')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('kije')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.kije, 'kije')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('kask')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.kask, 'kask')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('deska')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.deska, 'deska')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('wiazania')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.wiazania, 'wiazania')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('buty_sb')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.buty_sb, 'buty_sb')}
                            </td>
                            <td className={`px-2 py-4 text-sm text-white align-middle ${getCellBackgroundColor('ski_mojo')}`}>
                              {renderEquipmentList(group.sprzet_w_kategoriach.ski_mojo, 'ski_mojo')}
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

