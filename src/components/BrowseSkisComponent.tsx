import React, { useState, useEffect } from 'react';
import type { SkiData, SearchCriteria, MatchDetails } from '../types/ski.types';
import { ReservationApiClient } from '../services/reservationApiClient';
import { SkiEditModal } from './SkiEditModal';
import { Toast } from './Toast';
import { SkiMatchingServiceV2 } from '../services/skiMatchingServiceV2';

interface BrowseSkisComponentProps {
  allSkis: SkiData[];
  browseCriteria: Partial<SearchCriteria>;
  onBack: () => void;
  initialFilter?: string;
  // onRefreshData?: () => Promise<void>;
  // isEmployeeMode?: boolean;
}

type SortField = 'MARKA' | 'MODEL' | 'DLUGOSC' | 'POZIOM' | 'PLEC' | 'ROK' | 'PRZEZNACZENIE';
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
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'MARKA',
    direction: 'asc'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<Map<string, any>>(new Map());
  const [matchDetails, setMatchDetails] = useState<Map<string, MatchDetails>>(new Map());
  const itemsPerPage = 20;
  
  // NOWY STAN: Wyszukiwanie tekstowe
  const [searchTerm, setSearchTerm] = useState('');

  // NOWY STAN: Filtry typu i kategorii sprzętu - inicjalizuj z initialFilter
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  
  // Aktualizuj activeFilter gdy initialFilter się zmienia (np. przy przełączaniu między kartami)
  useEffect(() => {
    if (initialFilter) {
      console.log(`BrowseSkisComponent: Ustawiam aktywny filtr z initialFilter: ${initialFilter}`);
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  // NOWY STAN: Modal edycji/dodawania
  const [isModalOpen, setIsModalOpen] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [modalMode] = useState<'edit' | 'add'>('edit');
  const [selectedSki, setSelectedSki] = useState<SkiData | undefined>(undefined);

  // NOWY STAN: Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastType] = useState<'success' | 'error'>('success');

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
  const generateAvailabilitySquares = (ski: SkiData): React.ReactElement => {
    // Znajdź wszystkie narty tego samego modelu i długości
    const sameModelSkis = allSkis.filter(s => 
      s.MARKA === ski.MARKA && 
      s.MODEL === ski.MODEL && 
      s.DLUGOSC === ski.DLUGOSC
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

  // Zamknij modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSki(undefined);
  };

  // src/components/BrowseSkisComponent.tsx: Funkcja filtrowania sprzętu
  const filterSkis = (
    skis: SkiData[], 
    searchTerm: string,
    activeFilter: string
  ): SkiData[] => {
    let filtered = skis;

    // Filtruj po przyciskach
    if (activeFilter !== 'all') {
      filtered = filtered.filter(ski => {
        // Filtrowanie według typu sprzętu i kategorii (zgodne z AnimaComponent)
        switch (activeFilter) {
          case 'TOP':
            return ski.TYP_SPRZETU === 'NARTY' && ski.KATEGORIA === 'TOP';
          case 'VIP':
            return ski.TYP_SPRZETU === 'NARTY' && ski.KATEGORIA === 'VIP';
          case 'JUNIOR':
            return ski.TYP_SPRZETU === 'NARTY' && ski.KATEGORIA === 'JUNIOR';
          case 'BUTY_JUNIOR':
            return ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'JUNIOR';
          case 'DOROSLE':
            return ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'DOROSLE';
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
      filtered = filtered.filter(ski => 
        ski.MARKA.toLowerCase().includes(term) ||
        ski.MODEL.toLowerCase().includes(term) ||
        ski.POZIOM.toLowerCase().includes(term) ||
        ski.PLEC.toLowerCase().includes(term) ||
        ski.PRZEZNACZENIE.toLowerCase().includes(term) ||
        ski.ATUTY.toLowerCase().includes(term) ||
        ski.DLUGOSC.toString().includes(term) ||
        ski.ROK.toString().includes(term)
      );
    }

    return filtered;
  };

  // Funkcja sortowania nart
  const sortSkis = (skis: SkiData[], config: SortConfig): SkiData[] => {
    return [...skis].sort((a, b) => {
      let aValue: any = a[config.field];
      let bValue: any = b[config.field];

      // Konwersja dla pól numerycznych
      if (config.field === 'DLUGOSC' || config.field === 'ROK') {
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

  // Sortowanie i paginacja z grupowaniem
  const filteredSkis = filterSkis(allSkis, searchTerm, activeFilter);
  const groupedSkis = filteredSkis; // Bez grupowania po modelu
  const sortedSkis = sortSkis(groupedSkis, sortConfig);
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
    <div className="min-h-screen bg-[#386BB2] p-3 lg:p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header z wyszukiwaniem - responsywny */}
        <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                Przeglądaj sprzęt
              </h1>
              <p className="text-[#A6C2EF] text-sm">
                Znaleziono {sortedSkis.length} nart
              </p>
            </div>

            {/* Przyciski filtrów */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleQuickFilter('all')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'all' ? 'bg-gray-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>📦 Cały sprzęt</button>
              <button onClick={() => handleQuickFilter('TOP')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'TOP' ? 'bg-blue-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>🎿 Narty TOP</button>
              <button onClick={() => handleQuickFilter('VIP')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'VIP' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>🎿 Narty VIP</button>
              <button onClick={() => handleQuickFilter('JUNIOR')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'JUNIOR' ? 'bg-green-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>👶 Narty JUNIOR</button>
              <button onClick={() => handleQuickFilter('BUTY_JUNIOR')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'BUTY_JUNIOR' ? 'bg-green-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>👶 Buty Junior</button>
              <button onClick={() => handleQuickFilter('DOROSLE')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'DOROSLE' ? 'bg-purple-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>🥾 Buty Dorosłe</button>
              <button onClick={() => handleQuickFilter('DESKI')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'DESKI' ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>🏂 Deski</button>
              <button onClick={() => handleQuickFilter('BUTY_SNOWBOARD')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === 'BUTY_SNOWBOARD' ? 'bg-red-500 text-white shadow-lg' : 'bg-[#2C699F] text-white hover:bg-[#386BB2] shadow-md hover:shadow-lg'}`}>👢 Buty SB</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <button
                onClick={onBack}
                className="bg-[#2C699F] hover:bg-[#194576] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                ← Wróć
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
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
            <p className="text-sm text-gray-400 mt-2">
              Znaleziono {sortedSkis.length} pasujących nart.
            </p>
          )}
        </div>

        {/* Tabela sprzętu */}
        <div className="bg-[#194576] rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2C699F]">
                {/* NOWA ZMIANA: Nowy układ kolumn */}
                <tr>
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
                    onClick={() => handleSort('ROK')}
                  >
                    <div className="flex items-center gap-2">
                      Rok {renderSortIcon('ROK')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-[#194576]"
                    onClick={() => handleSort('PRZEZNACZENIE')}
                  >
                    <div className="flex items-center gap-2">
                      Przeznaczenie {renderSortIcon('PRZEZNACZENIE')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Atuty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Wzrost (cm)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Waga (kg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Dostępność</th>
                </tr>
              </thead>
              <tbody className="bg-[#A6C2EF] divide-y divide-[#2C699F]">
                {currentSkis.map((ski) => (
                  <tr key={ski.ID} className="hover:bg-[#2C699F]">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.MARKA}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.MODEL}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#194576]">
                      {ski.DLUGOSC} cm
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'poziom')}`}>
                      {formatLevel(ski.POZIOM)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'plec')}`}>
                      {formatGender(ski.PLEC)}
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
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'wzrost')}`}>
                      {ski.WZROST_MIN}-{ski.WZROST_MAX}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-black font-semibold ${getCellColorClass(ski.ID, 'waga')}`}>
                      {ski.WAGA_MIN}-{ski.WAGA_MAX}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {generateAvailabilitySquares(ski)}
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

      {/* Modal edycji/dodawania */}
      <SkiEditModal
        isOpen={isModalOpen}
        mode={modalMode}
        ski={selectedSki}
        onClose={handleCloseModal}
        onSave={async () => {}} // Placeholder as async
      />

      {/* Toast notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={!!toastMessage}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
