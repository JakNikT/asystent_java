import React, { useState, useEffect } from 'react';
import type { SkiData, SearchCriteria, MatchDetails } from '../types/ski.types';
import { ReservationApiClient } from '../services/reservationApiClient';
import { SkiEditModal } from './SkiEditModal';
import { Toast } from './Toast';
import { SkiMatchingServiceV2 } from '../services/skiMatchingServiceV2';
import { SkiDataService } from '../services/skiDataService';
import type { ReservationInfo } from '../services/reservationService';
import { formatModelName, formatBrandName, extractFlexFromModel } from '../utils/nameFormatter';
import { Input } from './ui/Input';
import { 
  validateHeightRealtime, 
  validateWeightRealtime, 
  validateLevelRealtime, 
  validateGenderRealtime 
} from '../utils/formValidation';

interface TabInfo {
  id: string;
  label: string;
}

interface BrowseSkisComponentProps {
  allSkis: SkiData[];
  browseCriteria: Partial<SearchCriteria>;
  onBack: () => void;
  initialFilter?: string;
  tabs?: TabInfo[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onAddTab?: () => void;
  onRemoveTab?: (tabId: string) => void;
  onRefreshData?: () => Promise<void>;
  isEmployeeMode?: boolean;
  onCriteriaChange?: (criteria: Partial<SearchCriteria>) => void;
}

type SortField = 'MARKA' | 'MODEL' | 'DLUGOSC' | 'POZIOM' | 'PLEC' | 'PRZEZNACZENIE' | 'FLEX';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const BrowseSkisComponent: React.FC<BrowseSkisComponentProps> = ({
  allSkis,
  browseCriteria,
  onBack,
  initialFilter = 'all',
  tabs = [],
  activeTabId,
  onTabChange,
  onAddTab,
  onRemoveTab,
  onRefreshData,
  isEmployeeMode = false,
  onCriteriaChange,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'DLUGOSC',
    direction: 'asc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<Map<string, any>>(new Map());
  const [matchDetails, setMatchDetails] = useState<Map<string, MatchDetails>>(new Map());
  // ZMIENIONE: Wyświetl wszystkie wyniki na jednej stronie (paginacja wyłączona)
  // Ustawiono na bardzo dużą liczbę, aby praktycznie wyłączyć paginację
  const itemsPerPage = 10000;

  // NOWY STAN: Wyszukiwanie tekstowe
  const [searchTerm, setSearchTerm] = useState('');

  // NOWY STAN: Filtry typu i kategorii sprzętu - inicjalizuj z initialFilter
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);

  // Zmienna pomocnicza do sprawdzania czy wyświetlamy buty (dla ukrywania kolumn)
  // Dla butów junior, snowboard i dorosłych ukrywamy kolumny: Wzrost, Waga, Poziom, Płeć, Przeznaczenie, Atuty
  const shouldHideColumns = activeFilter === 'BUTY_JUNIOR' || activeFilter === 'BUTY_SNOWBOARD' || activeFilter === 'DOROSLE';
  // Dla nart junior ukrywamy tylko: Płeć, Przeznaczenie, Atuty (Wzrost, Waga, Poziom pozostają widoczne)
  const shouldHideJuniorSkiColumns = activeFilter === 'JUNIOR';

  // Aktualizuj activeFilter gdy initialFilter się zmienia (np. przy przełączaniu między kartami)
  useEffect(() => {
    if (initialFilter) {
      console.log(`BrowseSkisComponent: Ustawiam aktywny filtr z initialFilter: ${initialFilter}`);
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  // Synchronizacja pól edycji z browseCriteria (gdy zmienia się z Dashboard)
  useEffect(() => {
    console.log('BrowseSkisComponent: Synchronizuję pola edycji z browseCriteria:', browseCriteria);
    setEditWzrost(browseCriteria.wzrost?.toString() || '');
    setEditWaga(browseCriteria.waga?.toString() || '');
    setEditPoziom(browseCriteria.poziom?.toString() || '');
    setEditPlec(browseCriteria.plec?.toUpperCase() || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseCriteria.wzrost, browseCriteria.waga, browseCriteria.poziom, browseCriteria.plec]);

  // NOWY STAN: Modal edycji/dodawania
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('edit');
  const [selectedSki, setSelectedSki] = useState<SkiData | undefined>(undefined);

  // NOWY STAN: Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // NOWY STAN: Pola edycji kryteriów (wzrost, waga, poziom, płeć)
  const [editWzrost, setEditWzrost] = useState<string>('');
  const [editWaga, setEditWaga] = useState<string>('');
  const [editPoziom, setEditPoziom] = useState<string>('');
  const [editPlec, setEditPlec] = useState<string>('');

  // NOWY STAN: Pola wyszukiwania (Flex, Długość)
  const [searchFlex, setSearchFlex] = useState<string>('');
  const [searchDlugosc, setSearchDlugosc] = useState<string>('');

  // Ładowanie statusów dostępności
  useEffect(() => {
    const loadAvailabilityStatuses = async () => {
      const startTime = Date.now();
      const statusMap = new Map<string, any>();

      try {
        // Sprawdź czy użytkownik wpisał daty
        const hasUserDates = browseCriteria?.dateFrom && browseCriteria?.dateTo;

        if (!hasUserDates) {
          console.log('BrowseSkisComponent: Brak dat - wszystkie narty dostępne (zielone kwadraciki)');
          setAvailabilityStatuses(new Map());
          return;
        }

        // Użyj dat z formularza użytkownika
        const startDate = browseCriteria.dateFrom;
        const endDate = browseCriteria.dateTo;

        if (!startDate || !endDate) {
          console.log('BrowseSkisComponent: Brak dat, przerywam sprawdzanie dostępności.');
          return;
        }

        // Policz ile nart ma kod
        const skisWithCode = allSkis.filter(ski => ski.KOD && ski.KOD !== 'NO_CODE');
        const totalSkis = skisWithCode.length;

        console.log('═══════════════════════════════════════════════════════');
        console.log('BrowseSkisComponent: 📋 PRZEGLĄDAJ - Rozpoczęcie sprawdzania dostępności');
        console.log('BrowseSkisComponent:   Okres:', startDate.toLocaleDateString(), '-', endDate.toLocaleDateString());
        console.log('BrowseSkisComponent:   Nart do sprawdzenia:', totalSkis);

        // OPTYMALIZACJA: Pobierz dane dostępności RAZ dla całego okresu
        console.log('BrowseSkisComponent:   Pobieram dane dostępności z API (jedno zapytanie)...');
        const allAvailabilityData = await ReservationApiClient.loadAvailabilityForPeriod(startDate, endDate);
        console.log(`BrowseSkisComponent:   ✅ Pobrano ${allAvailabilityData.length} pozycji (dostępne dla wszystkich nart)`);
        console.log('BrowseSkisComponent:   Rozpoczynam sprawdzanie dostępności...');

        let checkedCount = 0;
        let availableCount = 0;
        let warningCount = 0;
        let reservedCount = 0;

        // Sprawdź status dla każdej narty z kodem (NOWY SYSTEM 3-KOLOROWY)
        // Używamy już pobranych danych zamiast pobierać dla każdej narty osobno
        for (const ski of skisWithCode) {
          try {
            checkedCount++;
            // OPTYMALIZACJA: Przekaż już pobrane dane zamiast pobierać ponownie
            const availabilityInfo = await ReservationApiClient.getSkiAvailabilityStatus(
              ski.KOD,
              startDate,
              endDate,
              allAvailabilityData  // Użyj już pobranych danych
            );
            statusMap.set(ski.KOD, availabilityInfo);

            if (availabilityInfo.status === 'available') availableCount++;
            else if (availabilityInfo.status === 'warning') warningCount++;
            else if (availabilityInfo.status === 'reserved') reservedCount++;

            // Loguj co 100 nart (żeby nie spamować konsoli)
            if (checkedCount % 100 === 0 || checkedCount === totalSkis) {
              console.log(`BrowseSkisComponent:   Postęp: ${checkedCount}/${totalSkis} nart sprawdzonych`);
            }
          } catch (error) {
            console.error(`BrowseSkisComponent:   ❌ Błąd dla kodu ${ski.KOD}:`, error);
          }
        }

        const duration = Date.now() - startTime;
        console.log('BrowseSkisComponent:   ✅ Zakończono sprawdzanie dostępności:');
        console.log('BrowseSkisComponent:      - Sprawdzonych nart:', checkedCount);
        console.log('BrowseSkisComponent:      - 🟢 Dostępne:', availableCount);
        console.log('BrowseSkisComponent:      - 🟡 Ostrzeżenie:', warningCount);
        console.log('BrowseSkisComponent:      - 🔴 Zarezerwowane:', reservedCount);
        console.log('BrowseSkisComponent:   ⏱️  Czas wykonania:', duration, 'ms');
        console.log('═══════════════════════════════════════════════════════');

        setAvailabilityStatuses(statusMap);
      } catch (error) {
        console.error('BrowseSkisComponent: ❌ Błąd ładowania statusów dostępności:', error);
      }
    };

    loadAvailabilityStatuses();
  }, [allSkis, browseCriteria?.dateFrom, browseCriteria?.dateTo]);

  // NOWA ZMIANA: Efekt do obliczania kolorów dopasowania
  useEffect(() => {
    console.log('BrowseSkisComponent: Obliczanie kolorów dopasowania dla kryteriów:', browseCriteria);
    const newMatchDetails = new Map<string, MatchDetails>();

    // Jeśli nie ma żadnych kryteriów, nie rób nic (wszystko będzie zielone/domyślne)
    if (Object.keys(browseCriteria).filter(k => browseCriteria[k as keyof typeof browseCriteria] !== undefined).length === 0) {
      setMatchDetails(new Map()); // Wyczyść szczegóły, jeśli formularz jest pusty
      return;
    }

    allSkis.forEach(ski => {
      // Dla każdej narty wywołaj nową funkcję z serwisu dopasowania
      const details = SkiMatchingServiceV2.getMatchDetails(ski, browseCriteria);
      if (Object.keys(details).length > 0) {
        newMatchDetails.set(ski.ID, details);
      }
    });

    console.log(`BrowseSkisComponent: Znaleziono ${newMatchDetails.size} szczegółów dopasowania.`);
    setMatchDetails(newMatchDetails);
  }, [browseCriteria, allSkis]);

  // Funkcja generowania kwadracików dla grupowanych nart (NOWY SYSTEM 3-KOLOROWY)
  // src/components/BrowseSkisComponent.tsx: Znajduje narty tego samego modelu, typu i kategorii
  const generateAvailabilitySquares = (ski: SkiData): React.ReactElement => {
    // Znajdź wszystkie narty tego samego modelu, długości, typu i kategorii
    const sameModelSkis = allSkis.filter(s =>
      s && ski &&
      (s.MARKA || '') === (ski.MARKA || '') &&
      (s.MODEL || '') === (ski.MODEL || '') &&
      s.DLUGOSC === ski.DLUGOSC &&
      (s.TYP_SPRZETU || '') === (ski.TYP_SPRZETU || '') &&
      (s.KATEGORIA || '') === (ski.KATEGORIA || '')
    );

    const squares = sameModelSkis.map((s, index) => {
      const availabilityInfo = s.KOD ? availabilityStatuses.get(s.KOD) : null;

      // Określ kolor tła na podstawie statusu (3 kolory)
      let bgColor = 'bg-green-500'; // Domyślnie zielony (brak dat lub brak rezerwacji)
      let statusEmoji = '🟢';
      let statusText = 'Dostępne';

      if (availabilityInfo) {
        if (availabilityInfo.color === 'red') {
          bgColor = 'bg-red-500';
          statusEmoji = '🔴';
          statusText = 'Zarezerwowane';
        } else if (availabilityInfo.color === 'yellow') {
          bgColor = 'bg-yellow-500';
          statusEmoji = '🟡';
          statusText = 'Uwaga';
        } else {
          bgColor = 'bg-green-500';
          statusEmoji = '🟢';
          statusText = 'Dostępne';
        }
      }

      // Stwórz tooltip z informacjami
      let tooltip = `Sztuka ${index + 1} - ${statusText}\nKod: ${s.KOD || 'Brak kodu'}`;

      if (availabilityInfo) {
        tooltip += `\n\n${statusEmoji} ${availabilityInfo.message}`;

        // Dodaj informacje o rezerwacjach/wypożyczeniach z datami
        if (availabilityInfo.reservations && availabilityInfo.reservations.length > 0) {
          tooltip += `\n\n📅 Rezerwacje/Wypożyczenia:`;
          availabilityInfo.reservations.forEach((reservation: ReservationInfo, resIndex: number) => {
            // Sprawdź czy reservation ma pola startDate i endDate
            if (reservation.startDate && reservation.endDate) {
              const startDate = reservation.startDate instanceof Date
                ? reservation.startDate
                : new Date(reservation.startDate);
              const endDate = reservation.endDate instanceof Date
                ? reservation.endDate
                : new Date(reservation.endDate);

              const startDateStr = startDate.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              const endDateStr = endDate.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              tooltip += `\n  ${resIndex + 1}. ${startDateStr} - ${endDateStr}`;
              if (reservation.clientName) {
                tooltip += `\n     Klient: ${reservation.clientName}`;
              }
            }
          });
        }
      }

      return (
        <span
          key={s.KOD || `no-code-${index}`}
          className={`inline-block w-4 h-4 text-white text-xs font-bold rounded mr-1 ${bgColor}`}
          title={tooltip}
        >
          {index + 1}
        </span>
      );
    });

    return <div className="flex flex-wrap">{squares}</div>;
  };

  // NOWE FUNKCJE: Obsługa edycji i dodawania

  // src/components/BrowseSkisComponent.tsx: Funkcja obsługi zmian pól edycji kryteriów
  const handleFieldChange = (field: 'wzrost' | 'waga' | 'poziom' | 'plec', value: string) => {
    console.log(`BrowseSkisComponent: Zmiana pola ${field} - wartość: ${value}`);

    // Walidacja w czasie rzeczywistym
    let isValid = true;
    let errorMessage = '';

    if (field === 'wzrost') {
      const validation = validateHeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (field === 'waga') {
      const validation = validateWeightRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (field === 'poziom') {
      const validation = validateLevelRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    } else if (field === 'plec') {
      const validation = validateGenderRealtime(value);
      isValid = validation.isValid;
      errorMessage = validation.message;
    }

    // Jeśli walidacja nie przeszła, nie aktualizuj wartości
    if (!isValid) {
      console.log(`BrowseSkisComponent: Walidacja nie przeszła dla ${field} - ${errorMessage}`);
      return;
    }

    // Aktualizuj lokalny stan
    if (field === 'wzrost') {
      setEditWzrost(value);
    } else if (field === 'waga') {
      setEditWaga(value);
    } else if (field === 'poziom') {
      setEditPoziom(value);
    } else if (field === 'plec') {
      setEditPlec(value.toUpperCase());
    }

    // Przygotuj zaktualizowane kryteria
    const updatedCriteria: Partial<SearchCriteria> = {
      ...browseCriteria,
    };

    if (field === 'wzrost') {
      updatedCriteria.wzrost = value ? parseInt(value) : undefined;
    } else if (field === 'waga') {
      updatedCriteria.waga = value ? parseInt(value) : undefined;
    } else if (field === 'poziom') {
      updatedCriteria.poziom = value ? parseInt(value) : undefined;
    } else if (field === 'plec') {
      updatedCriteria.plec = value ? (value.toUpperCase() as 'M' | 'K' | 'W') : undefined;
    }

    // Wywołaj callback do aktualizacji w Dashboard
    if (onCriteriaChange) {
      console.log(`BrowseSkisComponent: Aktualizuję kryteria w Dashboard:`, updatedCriteria);
      onCriteriaChange(updatedCriteria);
    }
  };

  // src/components/BrowseSkisComponent.tsx: Funkcja otwierania modala edycji
  const handleEdit = (ski: SkiData) => {
    console.log('BrowseSkisComponent: Otwieranie modala edycji dla narty:', ski.ID);
    setSelectedSki(ski);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // src/components/BrowseSkisComponent.tsx: Funkcja zapisywania zmian
  const handleSave = async (
    skiData: Partial<SkiData>,
    targetSkiId?: string,
    updateAll?: boolean
  ): Promise<void> => {
    try {
      console.log('BrowseSkisComponent: Zapisuję zmiany:', { skiData, targetSkiId, updateAll });

      if (updateAll && targetSkiId === undefined) {
        // Aktualizacja wszystkich nart w grupie
        // src/components/BrowseSkisComponent.tsx: Uwzględnia również typ sprzętu i kategorię
        const sameModelSkis = allSkis.filter(s =>
          s && selectedSki &&
          (s.MARKA || '') === (selectedSki.MARKA || '') &&
          (s.MODEL || '') === (selectedSki.MODEL || '') &&
          s.DLUGOSC === selectedSki.DLUGOSC &&
          (s.TYP_SPRZETU || '') === (selectedSki.TYP_SPRZETU || '') &&
          (s.KATEGORIA || '') === (selectedSki.KATEGORIA || '')
        );

        if (sameModelSkis.length === 0) {
          throw new Error('Nie znaleziono nart w grupie');
        }

        const ids = sameModelSkis.map(s => s.ID);
        const result = await SkiDataService.updateMultipleSkis(ids, skiData);

        if (result) {
          console.log('BrowseSkisComponent: Zaktualizowano wszystkie narty w grupie:', ids.length);
          setToastMessage(`Zaktualizowano ${ids.length} nart w grupie`);
          setToastType('success');
        } else {
          throw new Error('Błąd aktualizacji wielu nart');
        }
      } else if (targetSkiId) {
        // Aktualizacja pojedynczej narty
        const result = await SkiDataService.updateSki(targetSkiId, skiData);

        if (result) {
          console.log('BrowseSkisComponent: Zaktualizowano nartę:', targetSkiId);
          setToastMessage('Narta zaktualizowana pomyślnie');
          setToastType('success');
        } else {
          throw new Error('Błąd aktualizacji narty');
        }
      } else if (selectedSki) {
        // Fallback: aktualizacja wybranej narty
        const result = await SkiDataService.updateSki(selectedSki.ID, skiData);

        if (result) {
          console.log('BrowseSkisComponent: Zaktualizowano nartę:', selectedSki.ID);
          setToastMessage('Narta zaktualizowana pomyślnie');
          setToastType('success');
        } else {
          throw new Error('Błąd aktualizacji narty');
        }
      }

      // Odśwież dane jeśli funkcja jest dostępna
      if (onRefreshData) {
        await onRefreshData();
      }

      // Zamykamy modal po udanym zapisie (onSave w modalu już wywołuje onClose)
    } catch (error) {
      console.error('BrowseSkisComponent: Błąd zapisywania:', error);
      setToastMessage(error instanceof Error ? error.message : 'Błąd zapisywania narty');
      setToastType('error');
      throw error; // Rzuć błąd aby modal mógł go obsłużyć
    }
  };

  // Zamknij modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSki(undefined);
  };

  // Funkcja pomocnicza: znajdź wszystkie narty w grupie (dla modala edycji)
  // src/components/BrowseSkisComponent.tsx: Uwzględnia również typ sprzętu i kategorię
  const getSkisInGroup = (ski: SkiData): SkiData[] => {
    return allSkis.filter(s =>
      s && ski &&
      (s.MARKA || '') === (ski.MARKA || '') &&
      (s.MODEL || '') === (ski.MODEL || '') &&
      s.DLUGOSC === ski.DLUGOSC &&
      (s.TYP_SPRZETU || '') === (ski.TYP_SPRZETU || '') &&
      (s.KATEGORIA || '') === (ski.KATEGORIA || '')
    );
  };

  // src/components/BrowseSkisComponent.tsx: Funkcja filtrowania sprzętu
  const filterSkis = (
    skis: SkiData[],
    searchTerm: string,
    activeFilter: string,
    flexFilter: string = '',
    dlugoscFilter: string = ''
  ): SkiData[] => {
    // Zabezpieczenie: sprawdź czy skis jest tablicą
    if (!Array.isArray(skis) || skis.length === 0) {
      console.warn('BrowseSkisComponent: filterSkis otrzymał pustą tablicę lub nie-tablicę:', skis);
      return [];
    }

    let filtered = skis;

    // Filtruj po przyciskach
    if (activeFilter !== 'all') {
      filtered = filtered.filter(ski => {
        // Zabezpieczenie: sprawdź czy ski ma wymagane pola
        if (!ski || !ski.TYP_SPRZETU) {
          return false;
        }

        // Filtrowanie według typu sprzętu i kategorii (zgodne z Dashboard)
        switch (activeFilter) {
          case 'TOP':
            return ski.TYP_SPRZETU === 'NARTY' && (ski.KATEGORIA || '') === 'TOP';
          case 'VIP':
            return ski.TYP_SPRZETU === 'NARTY' && (ski.KATEGORIA || '') === 'VIP';
          case 'JUNIOR':
            return ski.TYP_SPRZETU === 'NARTY' && (ski.KATEGORIA || '') === 'JUNIOR';
          case 'BUTY_JUNIOR':
            return ski.TYP_SPRZETU === 'BUTY' && (ski.KATEGORIA || '') === 'JUNIOR';
          case 'DOROSLE':
            return ski.TYP_SPRZETU === 'BUTY' && (ski.KATEGORIA || '') === 'DOROSLE';
          case 'DESKI':
            return ski.TYP_SPRZETU === 'DESKI';
          case 'BUTY_SNOWBOARD':
            return ski.TYP_SPRZETU === 'BUTY_SNOWBOARD';
          default:
            // Fallback - spróbuj dopasować do KATEGORIA (dla kompatybilności wstecznej)
            return ski.KATEGORIA === activeFilter;
        }
      });
    }

    // Filtruj po tekście wyszukiwania
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      // Pomocnicza funkcja do mapowania przeznaczenia na pełne nazwy (dla wyszukiwania)
      const getPurposeFullName = (purpose: string): string => {
        switch (purpose) {
          case 'SL': return 'slalom';
          case 'G': return 'gigant';
          case 'SLG': return 'pomiędzy';
          case 'OFF': return 'poza trasę';
          default: return purpose.toLowerCase();
        }
      };

      filtered = filtered.filter(ski => {
        // Zabezpieczenie: wszystkie pola mogą być null/undefined z MySQL
        const marka = (ski.MARKA || '').toLowerCase();
        const model = (ski.MODEL || '').toLowerCase();
        const poziom = (ski.POZIOM || '').toLowerCase();
        const plec = (ski.PLEC || '').toLowerCase();
        const przeznaczenieRaw = (ski.PRZEZNACZENIE || '').toLowerCase();
        // Dodatkowe: sprawdź również pełne nazwy przeznaczenia (dla lepszego wyszukiwania)
        const przeznaczenieFormatted = getPurposeFullName(ski.PRZEZNACZENIE || '');
        const atuty = (ski.ATUTY || '').toLowerCase();
        const dlugosc = (ski.DLUGOSC !== null && ski.DLUGOSC !== undefined) ? ski.DLUGOSC.toString() : '';

        // Rok jest teraz w MODEL (np. "SHAPE 3.0 (2025)"), więc będzie wyszukiwany przez model.includes(term)
        return marka.includes(term) ||
          model.includes(term) ||
          poziom.includes(term) ||
          plec.includes(term) ||
          przeznaczenieRaw.includes(term) ||
          przeznaczenieFormatted.includes(term) || // Wyszukiwanie po pełnych nazwach (Slalom, Gigant, itp.)
          atuty.includes(term) ||
          dlugosc.includes(term);
      });
    }

    // Filtruj po Flex (tylko dla butów dorosłych)
    if (flexFilter.trim()) {
      const flexTerm = flexFilter.trim().toLowerCase();
      filtered = filtered.filter(ski => {
        // Jeśli to but dorosły, sprawdź Flex
        if (ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'DOROSLE') {
          const flex = extractFlexFromModel(ski.MODEL);
          return flex ? flex.toLowerCase().includes(flexTerm) : false;
        }
        // Jeśli nie jest butem dorosłym, nie filtruj (pozostaw w wynikach)
        return true;
      });
    }

    // Filtruj po Długość
    if (dlugoscFilter.trim()) {
      const dlugoscTerm = dlugoscFilter.trim();
      filtered = filtered.filter(ski => {
        const dlugosc = (ski.DLUGOSC !== null && ski.DLUGOSC !== undefined) ? ski.DLUGOSC.toString() : '';
        return dlugosc.includes(dlugoscTerm);
      });
    }

    return filtered;
  };

  // Funkcja sortowania nart
  const sortSkis = (skis: SkiData[], config: SortConfig): SkiData[] => {
    return [...skis].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Sortowanie po flexie - wyciągnij flex z nazwy modelu
      if (config.field === 'FLEX') {
        const aFlex = extractFlexFromModel(a.MODEL);
        const bFlex = extractFlexFromModel(b.MODEL);
        // Traktuj brak flexu jako 0 (będzie na początku/końcu w zależności od kierunku)
        aValue = aFlex ? Number(aFlex) : 0;
        bValue = bFlex ? Number(bFlex) : 0;
      } else {
        // Dla pozostałych pól odczytaj wartość z obiektu
        aValue = a[config.field as keyof SkiData];
        bValue = b[config.field as keyof SkiData];

        // Konwersja dla pól numerycznych
        if (config.field === 'DLUGOSC') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }
        // Konwersja dla pól tekstowych (zabezpieczenie przed null/undefined)
        else {
          if (typeof aValue === 'string' && aValue) {
            aValue = aValue.toLowerCase();
          } else if (aValue === null || aValue === undefined) {
            aValue = '';
          }
          if (typeof bValue === 'string' && bValue) {
            bValue = bValue.toLowerCase();
          } else if (bValue === null || bValue === undefined) {
            bValue = '';
          }
        }
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

  // Funkcja grupowania nart po modelu (MARKA + MODEL + DLUGOSC + TYP_SPRZETU + KATEGORIA)
  // src/components/BrowseSkisComponent.tsx: Grupowanie uwzględnia również typ sprzętu i kategorię
  // NORMALIZACJA: Normalizuje MARKA i MODEL przed grupowaniem, aby ignorować różnice w spacji/wielkości liter
  const groupSkisByModel = (skis: SkiData[]): SkiData[] => {
    const grouped = new Map<string, SkiData>();

    // Funkcja normalizacji nazwy (usuwa dodatkowe spacje, normalizuje wielkość liter)
    // server.js: Normalizacja zapewnia, że "HEAD SHAPE 3.0" i "head shape 3.0" będą traktowane jako to samo
    const normalizeName = (name: string): string => {
      if (!name) return '';
      return name.trim().replace(/\s+/g, ' ').toUpperCase();
    };

    skis.forEach(ski => {
      // Normalizuj MARKA i MODEL przed utworzeniem klucza
      // To zapewnia, że narty z różnymi formatami nazw (np. "HEAD SHAPE 3.0" vs "head shape 3.0") będą grupowane razem
      const normalizedMarka = normalizeName(ski.MARKA || '');
      const normalizedModel = normalizeName(ski.MODEL || '');

      // Klucz grupowania: MARKA + MODEL + DLUGOSC + TYP_SPRZETU + KATEGORIA
      // To zapewnia, że VIP i TOP nie będą grupowane razem, nawet jeśli mają ten sam model
      const key = `${normalizedMarka}|${normalizedModel}|${ski.DLUGOSC || ''}|${ski.TYP_SPRZETU || ''}|${ski.KATEGORIA || ''}`;

      // Jeśli nie ma jeszcze tej grupy, dodaj pierwszą nartę jako reprezentanta
      if (!grouped.has(key)) {
        grouped.set(key, ski);
      }
    });

    // Zwróć tylko reprezentantów grup (jedna narta na kombinację modelu, typu i kategorii)
    return Array.from(grouped.values());
  };

  // Sortowanie i paginacja z grupowaniem
  const filteredSkis = filterSkis(allSkis, searchTerm, activeFilter, searchFlex, searchDlugosc);
  const groupedSkis = groupSkisByModel(filteredSkis); // Grupowanie po modelu
  const sortedSkis = sortSkis(groupedSkis, sortConfig);
  const totalPages = Math.ceil(sortedSkis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSkis = sortedSkis.slice(startIndex, endIndex);

  // Sprawdź czy w tabeli są buty dorosłe (dla wyświetlania kolumny Flex)
  const hasAdultBoots = currentSkis.some(ski => ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'DOROSLE');

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

  // src/components/BrowseSkisComponent.tsx: Funkcje obsługi szybkich filtrów
  const handleQuickFilter = (filter: string) => {
    console.log(`BrowseSkisComponent: Szybki filtr - ${filter}`);
    setActiveFilter(filter);
    setCurrentPage(1); // Reset do pierwszej strony
  };

  // NOWA ZMIANA: Funkcja pomocnicza do pobierania klasy koloru
  const getCellColorClass = (skiId: string, field: 'wzrost' | 'waga' | 'poziom' | 'plec'): string => {
    const details = matchDetails.get(skiId);
    const color = details?.[field]?.color;

    if (!color) {
      return 'bg-green-200/30'; // Domyślny kolor, jeśli brak danych lub pasuje
    }

    switch (color) {
      case 'green': return 'bg-green-300/80';
      case 'yellow': return 'bg-yellow-300/80';
      case 'red': return 'bg-red-300/80';
      default: return 'bg-green-200/30';
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: "url('/images/background.png')",
      }}
    >
      {/* Overlay dla lepszej czytelności */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

      <div className="relative z-10">
        {/* Tabs Navigation - System kart responsywny, scrollowalny poziomo na mobile */}
        {tabs.length > 0 && (
        <div className="relative w-full bg-[#194576] border-b-2 border-[#2C699F] py-2 px-4">
          <div className="max-w-[1100px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-[#2C699F] scrollbar-track-[#194576]">
            {/* Renderuj karty */}
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`group relative px-4 py-2 rounded-lg font-['Inter'] font-bold text-sm transition-all whitespace-nowrap min-w-[100px] ${activeTabId === tab.id
                  ? 'bg-[#386BB2] text-white'
                  : 'bg-[#2C699F] text-[#A6C2EF] hover:bg-[#194576] hover:text-white'
                  }`}
              >
                {tab.label}
                {/* Przycisk usuwania karty (tylko jeśli jest więcej niż 1 karta) */}
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTab?.(tab.id);
                    }}
                    className="ml-2 text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    ✕
                  </span>
                )}
              </button>
            ))}

            {/* Przycisk dodawania nowej karty - sticky na mobile */}
            {onAddTab && (
              <button
                onClick={onAddTab}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-['Inter'] font-bold text-sm transition-all flex items-center gap-1 whitespace-nowrap sticky right-0 shadow-lg"
                title="Dodaj nową osobę"
              >
                +
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-3 lg:p-6">
        <div className="max-w-8xl mx-auto">
          {/* Header z wyszukiwaniem - responsywny */}
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
              <div className="flex-shrink-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                  Przeglądaj sprzęt
                </h1>
                <p className="text-white/70 text-sm">
                  Znaleziono {sortedSkis.length} nart
                </p>
              </div>

              {/* Przyciski filtrów */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleQuickFilter('all')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'all' ? 'bg-gray-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>📦 Cały sprzęt</button>
                <button onClick={() => handleQuickFilter('TOP')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'TOP' ? 'bg-blue-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>🎿 Narty TOP</button>
                <button onClick={() => handleQuickFilter('VIP')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'VIP' ? 'bg-blue-700 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>🎿 Narty VIP</button>
                <button onClick={() => handleQuickFilter('JUNIOR')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'JUNIOR' ? 'bg-green-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>👶 Narty JUNIOR</button>
                <button onClick={() => handleQuickFilter('BUTY_JUNIOR')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'BUTY_JUNIOR' ? 'bg-green-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>👶 Buty Junior</button>
                <button onClick={() => handleQuickFilter('DOROSLE')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'DOROSLE' ? 'bg-purple-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>🥾 Buty Dorosłe</button>
                <button onClick={() => handleQuickFilter('DESKI')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'DESKI' ? 'bg-orange-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>🏂 Deski</button>
                <button onClick={() => handleQuickFilter('BUTY_SNOWBOARD')} className={`px-4 py-2 text-sm rounded-lg font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${activeFilter === 'BUTY_SNOWBOARD' ? 'bg-red-600 text-white border border-white/20 shadow-lg' : 'bg-[#0f2744]/50 text-white border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 shadow-sm'}`}>👢 Buty SB</button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <button
                  onClick={onBack}
                  className="bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white px-4 py-2 rounded-lg border border-white/5 hover:border-white/20 text-sm font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  ← Wróć
                </button>
              </div>
            </div>

          </div>

          {/* Tabela sprzętu */}
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f2744]/50 border-b border-white/10">
                  {/* Wiersz z polami edycji nad nagłówkami kolumn */}
                  <tr className="bg-[#0f2744]/70 border-b border-white/10">
                    {/* Pole wyszukiwania rozciągnięte na kolumny Marka i Model */}
                    <th colSpan={2} className="px-4 py-2">
                      <Input
                        type="text"
                        placeholder="Wpisz markę, model, poziom, płeć, przeznaczenie (Slalom, Gigant)..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                      />
                    </th>
                    {/* Pole wyszukiwania Flex - opcjonalnie */}
                    {hasAdultBoots && (
                      <th className="px-4 py-2">
                        <Input
                          type="text"
                          placeholder="Flex"
                          value={searchFlex}
                          onChange={(e) => {
                            setSearchFlex(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-20 h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                        />
                      </th>
                    )}
                    {/* Pole wyszukiwania Długość */}
                    <th className="px-4 py-2">
                      <Input
                        type="text"
                        placeholder="Długość"
                        value={searchDlugosc}
                        onChange={(e) => {
                          setSearchDlugosc(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-20 h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                      />
                    </th>
                    {/* Pole Wzrost - tylko gdy !shouldHideColumns */}
                    {!shouldHideColumns && (
                      <th className="px-4 py-2">
                        <Input
                          type="text"
                          placeholder="180"
                          value={editWzrost}
                          onChange={(e) => handleFieldChange('wzrost', e.target.value)}
                          className="w-20 h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                          maxLength={3}
                        />
                      </th>
                    )}
                    {/* Pole Waga - tylko gdy !shouldHideColumns */}
                    {!shouldHideColumns && (
                      <th className="px-4 py-2">
                        <Input
                          type="text"
                          placeholder="70"
                          value={editWaga}
                          onChange={(e) => handleFieldChange('waga', e.target.value)}
                          className="w-20 h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                          maxLength={3}
                        />
                      </th>
                    )}
                    {/* Pole Poziom - tylko gdy !shouldHideColumns */}
                    {!shouldHideColumns && (
                      <th className="px-4 py-2">
                        <Input
                          type="text"
                          placeholder="1-6"
                          value={editPoziom}
                          onChange={(e) => handleFieldChange('poziom', e.target.value)}
                          className="w-20 h-8 text-center font-bold text-sm bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                          maxLength={1}
                        />
                      </th>
                    )}
                    {/* Pole Płeć - tylko gdy !shouldHideColumns && !shouldHideJuniorSkiColumns */}
                    {!shouldHideColumns && !shouldHideJuniorSkiColumns && (
                      <th className="px-4 py-2">
                        <Input
                          type="text"
                          placeholder="M/K"
                          value={editPlec}
                          onChange={(e) => handleFieldChange('plec', e.target.value)}
                          className="w-20 h-8 text-center font-bold text-sm uppercase bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30"
                          maxLength={1}
                        />
                      </th>
                    )}
                    {/* Puste komórki dla pozostałych kolumn: Przeznaczenie, Atuty (gdy widoczne) */}
                    {!shouldHideColumns && !shouldHideJuniorSkiColumns && (
                      <>
                        <th className="px-4 py-2"></th>
                        <th className="px-4 py-2"></th>
                      </>
                    )}
                    {/* Dostępność */}
                    <th className="px-4 py-2"></th>
                    {/* Akcja - opcjonalnie */}
                    {isEmployeeMode && <th className="px-4 py-2"></th>}
                  </tr>
                  {/* NOWA ZMIANA: Nowy układ kolumn */}
                  <tr>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                      onClick={() => handleSort('MARKA')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Marka {renderSortIcon('MARKA')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                      onClick={() => handleSort('MODEL')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Model {renderSortIcon('MODEL')}
                      </div>
                    </th>
                    {hasAdultBoots && (
                      <th
                        className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                        onClick={() => handleSort('FLEX')}
                      >
                        <div className="flex items-center gap-2">
                          Flex {renderSortIcon('FLEX')}
                        </div>
                      </th>
                    )}
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                      onClick={() => handleSort('DLUGOSC')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Długość {renderSortIcon('DLUGOSC')}
                      </div>
                    </th>
                    {!shouldHideColumns && (
                      <>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Wzrost (cm)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Waga (kg)</th>
                        <th
                          className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                          onClick={() => handleSort('POZIOM')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Poziom {renderSortIcon('POZIOM')}
                          </div>
                        </th>
                      </>
                    )}
                    {!shouldHideColumns && !shouldHideJuniorSkiColumns && (
                      <>
                        <th
                          className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                          onClick={() => handleSort('PLEC')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Płeć {renderSortIcon('PLEC')}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f2744]/70 transition-colors"
                          onClick={() => handleSort('PRZEZNACZENIE')}
                        >
                          <div className="flex items-center gap-2">
                            Przeznaczenie {renderSortIcon('PRZEZNACZENIE')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Atuty
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Dostępność</th>
                    {isEmployeeMode && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Akcja</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white/5 divide-y divide-white/10">
                  {currentSkis.map((ski) => (
                    <tr key={ski.ID} className="hover:bg-white/10 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {formatBrandName(ski)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {formatModelName(ski)}
                      </td>
                      {hasAdultBoots && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {(ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'DOROSLE')
                            ? (extractFlexFromModel(ski.MODEL) || '-')
                            : '-'
                          }
                        </td>
                      )}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {/* src/components/BrowseSkisComponent.tsx: Wyświetlanie rozmiarów z połówkami (24.5 → "24,5 cm") */}
                        {typeof ski.DLUGOSC === 'number' && ski.DLUGOSC % 1 !== 0 
                          ? ski.DLUGOSC.toFixed(1).replace('.', ',') + ' cm'  // 24.5 → "24,5 cm"
                          : ski.DLUGOSC + ' cm'}  {/* 24 → "24 cm" */}
                      </td>
                      {!shouldHideColumns && (
                        <>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'wzrost')}`}>
                            {ski.WZROST_MIN}-{ski.WZROST_MAX}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'waga')}`}>
                            {ski.WAGA_MIN}-{ski.WAGA_MAX}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'poziom')}`}>
                            {formatLevel(ski.POZIOM)}
                          </td>
                        </>
                      )}
                      {!shouldHideColumns && !shouldHideJuniorSkiColumns && (
                        <>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'plec')}`}>
                            {formatGender(ski.PLEC)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                            {formatPurpose(ski.PRZEZNACZENIE)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-medium">
                            {ski.ATUTY || '-'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {generateAvailabilitySquares(ski)}
                      </td>
                      {isEmployeeMode && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEdit(ski)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wider transition-all shadow-sm border border-white/10 flex items-center gap-1"
                            title="Edytuj sprzęt"
                          >
                            ✏️ Edytuj
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
              <div className="bg-[#0f2744]/50 px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-bold rounded-md text-white bg-[#0f2744]/50 hover:bg-[#0f2744]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Poprzednia
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-bold rounded-md text-white bg-[#0f2744]/50 hover:bg-[#0f2744]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Następna
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-white/90">
                      Pokazuję <span className="font-bold">{startIndex + 1}</span> do{' '}
                      <span className="font-bold">{Math.min(endIndex, sortedSkis.length)}</span> z{' '}
                      <span className="font-bold">{sortedSkis.length}</span> wyników
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/10 bg-[#0f2744]/50 text-sm font-bold text-white hover:bg-[#0f2744]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold transition-all ${currentPage === pageNum
                              ? 'z-10 bg-[#0f2744]/70 border-white/20 text-white'
                              : 'bg-[#0f2744]/50 border-white/10 text-white hover:bg-[#0f2744]/70'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/10 bg-[#0f2744]/50 text-sm font-bold text-white hover:bg-[#0f2744]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          <div className="mt-4 text-sm text-white/80">
            <p>
              Sortowanie: <span className="font-bold">{sortConfig.field}</span> (
              {sortConfig.direction === 'asc' ? 'rosnąco' : 'malejąco'})
            </p>
          </div>
        </div>
      </div>

      {/* Modal edycji/dodawania - tylko w trybie pracownika */}
      {isEmployeeMode && (
        <SkiEditModal
          isOpen={isModalOpen}
          mode={modalMode}
          ski={selectedSki}
          allSkisInGroup={selectedSki ? getSkisInGroup(selectedSki) : undefined}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {/* Toast notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage('')}
      />
      </div>
    </div>
  );
};

