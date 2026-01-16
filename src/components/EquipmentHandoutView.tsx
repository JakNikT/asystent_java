import React, { useState, useMemo, useEffect } from 'react';
import type { ReservationData } from '../services/reservationService';
import { createLogger } from '../utils/logger';
import { DatePickerButton } from './DatePickerButton';
import { loadAppState, saveAppState } from '../utils/localStorage';

// src/components/EquipmentHandoutView.tsx: Logger dla EquipmentHandoutView
const logger = createLogger('EquipmentHandoutView');

interface EquipmentHandoutViewProps {
  reservations: ReservationData[];
  onBack: () => void;
  startInServiceMode?: boolean; // Opcjonalny prop do uruchomienia w trybie serwis
  startInCheckMode?: boolean; // Opcjonalny prop do uruchomienia w trybie sprawdz
}

// Interface dla pozycji sprzętu w kolejności z umowy
interface EquipmentListItem {
  equipment: string;
  kod: string;
  category: string;
}

// Interface dla klienta z rezerwacją
interface ClientWithReservation {
  klient: string;
  od: string;
  do: string;
  equipment: EquipmentListItem[]; // Płaska lista sprzętu w kolejności z umowy
  totalItems: number;
}

// Interface dla pozycji sprzętu w widoku serwisowym
interface ServiceEquipmentItem {
  kod: string;
  sprzet: string;
  klient: string;
  od: string;
  do: string;
  category: string;
}

// Mapowanie ID grup na kategorie sprzętu (skopiowane z ReservationsView.tsx)
const EQUIPMENT_CATEGORIES: Record<number, string> = {
  82291: 'narty',  // Narty
  85528: 'narty',  // Narty
  82293: 'narty',  // Narty TOP
  82412: 'narty',  // Narty VIP
  82758: 'narty',  // Narty JUNIOR
  82737: 'buty',   // Buty narciarskie
  82738: 'buty',   // Buty narciarskie dorosłe
  82827: 'buty',   // Buty narciarskie junior
  37758: 'kije',   // Kije
  38528: 'kask',   // Kask
  38533: 'kask',   // Kask
  83762: 'deska',  // Deska snowboardowa
  85813: 'deska',  // Deska snowboardowa
  85811: 'wiazania', // Wiązania
  83760: 'buty_sb', // Buty SB (snowboardowe)
  84312: 'ski_mojo' // SKI mojo
};

// src/components/EquipmentHandoutView.tsx: Komponent do wydawania sprzętu klientom - zoptymalizowany pod mobile
export const EquipmentHandoutView: React.FC<EquipmentHandoutViewProps> = ({ reservations, onBack, startInServiceMode = false, startInCheckMode = false }) => {
  // src/components/EquipmentHandoutView.tsx: Wczytaj stan z localStorage przy inicjalizacji
  const savedState = loadAppState()?.handoutState;

  const [selectedDate, setSelectedDate] = useState<string>(savedState?.selectedDate || '');
  const [selectedClient, setSelectedClient] = useState<ClientWithReservation | null>(
    savedState?.selectedClient || null
  );
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(savedState?.checkedItems || [])
  );
  const [searchText, setSearchText] = useState<string>(''); // src/components/EquipmentHandoutView.tsx: Pole wyszukiwania klienta

  // src/components/EquipmentHandoutView.tsx: Stany dla trybu sprawdzania kodu
  const [checkMode, setCheckMode] = useState<boolean>(startInCheckMode);
  const [codeSearch, setCodeSearch] = useState<string>('');
  const [foundReservation, setFoundReservation] = useState<ReservationData | null>(null);

  // src/components/EquipmentHandoutView.tsx: Stany dla trybu serwis
  const [serviceMode, setServiceMode] = useState<boolean>(startInServiceMode);
  const [serviceDate, setServiceDate] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [checkedServiceItems, setCheckedServiceItems] = useState<Set<string>>(new Set());
  const [showServiceResults, setShowServiceResults] = useState<boolean>(false);

  // src/components/EquipmentHandoutView.tsx: Funkcja pomocnicza do kategoryzacji sprzętu
  const getEquipmentCategory = (parentGroupId: number | null | undefined, sprzet?: string): string => {
    if (parentGroupId) {
      const category = EQUIPMENT_CATEGORIES[parentGroupId];
      if (category) return category;
    }
    // Fallback: użyj nazwy sprzętu
    if (sprzet) {
      const lower = sprzet.toLowerCase();
      if (lower.includes('narty')) return 'narty';
      if (lower.includes('buty') && !lower.includes('sb') && !lower.includes('snowboard')) return 'buty';
      if (lower.includes('buty') && (lower.includes('sb') || lower.includes('snowboard'))) return 'buty_sb';
      if (lower.includes('deska')) return 'deska';
    }
    return 'inne';
  };

  // src/components/EquipmentHandoutView.tsx: Synchronizuj tryby z propsami przy zmianie
  useEffect(() => {
    // Gdy zmienia się prop startInServiceMode, zaktualizuj stan serviceMode
    if (startInServiceMode !== serviceMode) {
      setServiceMode(startInServiceMode);
      // Reset stanów serwisu gdy wychodzimy z trybu serwis
      if (!startInServiceMode) {
        setServiceDate('');
        setSelectedCategories(new Set());
        setCheckedServiceItems(new Set());
        setShowServiceResults(false);
      }
    }
  }, [startInServiceMode, serviceMode]);

  useEffect(() => {
    // Gdy zmienia się prop startInCheckMode, zaktualizuj stan checkMode
    if (startInCheckMode !== checkMode) {
      setCheckMode(startInCheckMode);
      // Reset stanów sprawdzania gdy wychodzimy z trybu check
      if (!startInCheckMode) {
        setCodeSearch('');
        setFoundReservation(null);
      }
    }
  }, [startInCheckMode, checkMode]);

  // src/components/EquipmentHandoutView.tsx: Funkcja formatowania daty do wyświetlenia
  const formatDate = (dateString: string): string => {
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

  // src/components/EquipmentHandoutView.tsx: Funkcja do normalizacji daty (YYYY-MM-DD) z obsługą timezone
  const normalizeDate = (dateString: string): string => {
    try {
      // Pobierz tylko część YYYY-MM-DD z różnych formatów
      const dateOnly = dateString.split('T')[0].split(' ')[0];

      // Walidacja formatu YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        logger.debug('EquipmentHandoutView: Nieprawidłowy format daty', dateString);
        return '';
      }

      return dateOnly;
    } catch (error) {
      logger.debug('EquipmentHandoutView: Błąd normalizacji daty', dateString, error);
      return '';
    }
  };

  // src/components/EquipmentHandoutView.tsx: Wczytaj klientów z rezerwacjami na wybrany dzień
  const clientsForDate = useMemo(() => {
    if (!selectedDate) return [];

    logger.debug('EquipmentHandoutView: Filtrowanie rezerwacji dla daty', selectedDate);

    // Filtruj rezerwacje gdzie data od = wybrana data
    const filteredReservations = reservations.filter(res => {
      const resDate = normalizeDate(res.od);
      return resDate === selectedDate;
    });

    logger.debug('EquipmentHandoutView: Znaleziono rezerwacji', filteredReservations.length);

    // Grupuj po kliencie (klient + data od + data do)
    const grouped = new Map<string, ClientWithReservation>();

    // Zachowaj oryginalną kolejność sprzętu z umowy
    filteredReservations.forEach(res => {
      // Ignoruj pozycje PROMOTOR i inne nietypowe
      if (!res.sprzet || res.sprzet.toLowerCase().includes('promotor')) {
        return;
      }

      const key = `${res.klient.trim()}_${res.od}_${res.do}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          klient: res.klient.trim(),
          od: res.od,
          do: res.do,
          equipment: [],
          totalItems: 0
        });
      }

      const client = grouped.get(key)!;

      // Dodaj sprzęt w kolejności z umowy (nie sortuj)
      client.equipment.push({
        equipment: res.sprzet,
        kod: res.kod || '-',
        category: 'inne' // Kategoria nie jest potrzebna w widoku wydania
      });
      client.totalItems++;
    });

    // Konwertuj do tablicy i sortuj klientów alfabetycznie
    const clients = Array.from(grouped.values()).sort((a, b) => {
      const nameA = a.klient.toUpperCase();
      const nameB = b.klient.toUpperCase();
      return nameA.localeCompare(nameB);
    });

    logger.debug('EquipmentHandoutView: Znaleziono klientów', clients.length);
    return clients;
  }, [reservations, selectedDate]);

  // src/components/EquipmentHandoutView.tsx: Obsługa kliknięcia w klienta
  const handleClientClick = (client: ClientWithReservation) => {
    logger.debug('EquipmentHandoutView: Wybrano klienta', client.klient);
    setSelectedClient(client);
    setCheckedItems(new Set()); // Reset checkboxów przy zmianie klienta
  };

  // src/components/EquipmentHandoutView.tsx: Obsługa przełączania checkboxa
  const handleCheckboxToggle = (equipmentKey: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(equipmentKey)) {
        newSet.delete(equipmentKey);
      } else {
        newSet.add(equipmentKey);
      }
      return newSet;
    });
  };

  // src/components/EquipmentHandoutView.tsx: Powrót do listy klientów
  const handleBackToClientList = () => {
    setSelectedClient(null);
    setCheckedItems(new Set());
  };

  // src/components/EquipmentHandoutView.tsx: Powrót do wyboru daty
  const handleBackToDatePicker = () => {
    setSelectedDate('');
    setSelectedClient(null);
    setCheckedItems(new Set());
    setSearchText(''); // Reset wyszukiwania przy powrocie
  };

  // src/components/EquipmentHandoutView.tsx: Powrót z trybu sprawdzania kodu
  const handleBackFromCheckMode = () => {
    setCheckMode(false);
    setCodeSearch('');
    setFoundReservation(null);
  };

  // src/components/EquipmentHandoutView.tsx: Wyszukiwanie rezerwacji po kodzie sprzętu
  const handleCodeSearch = () => {
    if (!codeSearch.trim()) {
      logger.debug('EquipmentHandoutView: Pusta wartość kodu');
      return;
    }

    logger.debug('EquipmentHandoutView: Wyszukiwanie kodu', codeSearch);

    const now = new Date();
    // Znajdź wszystkie rezerwacje z tym kodem (przyszłe i aktualne)
    const matchingReservations = reservations
      .filter(res => res.kod?.toLowerCase() === codeSearch.toLowerCase().trim())
      .filter(res => new Date(res.do) >= now) // Tylko aktywne lub przyszłe (data do >= teraz)
      .sort((a, b) => new Date(a.od).getTime() - new Date(b.od).getTime());

    if (matchingReservations.length > 0) {
      logger.debug('EquipmentHandoutView: Znaleziono rezerwację', matchingReservations[0]);
      setFoundReservation(matchingReservations[0]); // Najbliższa rezerwacja
    } else {
      logger.debug('EquipmentHandoutView: Nie znaleziono rezerwacji dla kodu', codeSearch);
      setFoundReservation(null);
    }
  };

  // src/components/EquipmentHandoutView.tsx: Filtrowanie klientów po nazwie
  const filteredClients = useMemo(() => {
    if (!searchText) return clientsForDate;

    const searchLower = searchText.toLowerCase();
    return clientsForDate.filter(client =>
      client.klient.toLowerCase().includes(searchLower)
    );
  }, [clientsForDate, searchText]);

  // src/components/EquipmentHandoutView.tsx: Filtrowanie sprzętu dla widoku serwis
  const serviceEquipment: ServiceEquipmentItem[] = useMemo(() => {
    if (!serviceDate || selectedCategories.size === 0) return [];

    logger.debug('EquipmentHandoutView: Filtrowanie sprzętu serwisowego dla daty', serviceDate, 'kategorii:', Array.from(selectedCategories));

    return reservations
      .filter(res => {
        // Filtruj po dacie
        const resDate = normalizeDate(res.od);
        if (resDate !== serviceDate) return false;

        // Ignoruj pozycje PROMOTOR i inne nietypowe
        if (!res.sprzet || res.sprzet.toLowerCase().includes('promotor')) return false;

        // Pobierz kategorię sprzętu
        const category = getEquipmentCategory(res.parent_group_id, res.sprzet);

        // Mapuj wybrane kategorie użytkownika na kategorie systemowe
        // narty = VIP + TOP + Junior (wszystkie typy nart)
        // deska = tylko deski (bez wiązań)
        // buty = narciarskie + snowboardowe
        if (selectedCategories.has('narty') && category === 'narty') return true;
        if (selectedCategories.has('deska') && category === 'deska') return true;
        if (selectedCategories.has('buty') && (category === 'buty' || category === 'buty_sb')) return true;

        return false;
      })
      .map(res => ({
        kod: res.kod || '-',
        sprzet: res.sprzet,
        klient: res.klient,
        od: res.od,
        do: res.do,
        category: getEquipmentCategory(res.parent_group_id, res.sprzet)
      }))
      // Sortuj po kategorii, potem po nazwie sprzętu
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.sprzet.localeCompare(b.sprzet);
      });
  }, [reservations, serviceDate, selectedCategories, normalizeDate, getEquipmentCategory]);

  // src/components/EquipmentHandoutView.tsx: Obsługa przełączania kategorii
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // src/components/EquipmentHandoutView.tsx: Obsługa przełączania checkboxa serwisowego
  const handleServiceCheckboxToggle = (equipmentKey: string) => {
    setCheckedServiceItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(equipmentKey)) {
        newSet.delete(equipmentKey);
      } else {
        newSet.add(equipmentKey);
      }
      return newSet;
    });
  };

  // src/components/EquipmentHandoutView.tsx: Powrót z trybu serwis
  const handleBackFromServiceMode = () => {
    setServiceMode(false);
    setServiceDate('');
    setSelectedCategories(new Set());
    setCheckedServiceItems(new Set());
    setShowServiceResults(false);
  };

  // src/components/EquipmentHandoutView.tsx: Automatycznie zapisuj stan do localStorage przy każdej zmianie
  useEffect(() => {
    const handoutState = {
      selectedDate,
      selectedClient,
      checkedItems: Array.from(checkedItems) // Konwertuj Set na Array dla JSON
    };

    logger.info('EquipmentHandoutView: Auto-zapisywanie stanu widoku wydaj do LocalStorage');
    saveAppState('reservations', 'handout', handoutState);
  }, [selectedDate, selectedClient, checkedItems]);

  // WIDOK SERWIS: Wybór kategorii i daty, wyświetlenie sprzętu do przygotowania
  if (serviceMode) {
    return (
      <div
        className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-4 lg:p-6"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Overlay dla lepszej czytelności */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          {!showServiceResults ? (
            // KROK 1: Wybór kategorii i daty
            <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-6 lg:p-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 text-center">
                🔧 Serwis - Przygotowanie Sprzętu
              </h2>

              <div className="space-y-6">
                {/* Wybór kategorii */}
                <div className="space-y-3">
                  <label className="block text-white font-bold text-sm uppercase tracking-wider opacity-90">
                    Wybierz kategorie sprzętu:
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Narty */}
                    <label
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedCategories.has('narty')
                        ? 'bg-blue-500/30 border-blue-500/50'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has('narty')}
                        onChange={() => handleCategoryToggle('narty')}
                        className="w-6 h-6 cursor-pointer accent-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-lg font-bold text-white">🎿 Narty</div>
                        <div className="text-sm text-white/60">VIP, TOP, Junior</div>
                      </div>
                    </label>

                    {/* Snowboard */}
                    <label
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedCategories.has('deska')
                        ? 'bg-purple-500/30 border-purple-500/50'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has('deska')}
                        onChange={() => handleCategoryToggle('deska')}
                        className="w-6 h-6 cursor-pointer accent-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-lg font-bold text-white">🏂 Snowboard</div>
                        <div className="text-sm text-white/60">Tylko deski</div>
                      </div>
                    </label>

                    {/* Buty */}
                    <label
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedCategories.has('buty')
                        ? 'bg-orange-500/30 border-orange-500/50'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has('buty')}
                        onChange={() => handleCategoryToggle('buty')}
                        className="w-6 h-6 cursor-pointer accent-orange-500"
                      />
                      <div className="flex-1">
                        <div className="text-lg font-bold text-white">👢 Buty</div>
                        <div className="text-sm text-white/60">Narciarskie + Snowboardowe</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Wybór daty */}
                <DatePickerButton
                  label="Wybierz datę rezerwacji"
                  icon="📅"
                  value={serviceDate}
                  onChange={setServiceDate}
                />

                {/* Komunikat informacyjny */}
                <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-4">
                  <p className="text-blue-200 text-sm font-medium">
                    ℹ️ Wybierz kategorie i datę, aby zobaczyć listę sprzętu do przygotowania na serwis przed tym dniem.
                  </p>
                </div>

                {/* Przyciski */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowServiceResults(true)}
                    disabled={selectedCategories.size === 0 || !serviceDate}
                    className={`py-4 px-6 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-lg ${selectedCategories.size > 0 && serviceDate
                      ? 'bg-green-600 hover:bg-green-700 text-white border border-white/10'
                      : 'bg-gray-600/50 text-white/50 border border-white/5 cursor-not-allowed'
                      }`}
                  >
                    🔍 Szukaj
                  </button>
                  <button
                    onClick={handleBackFromServiceMode}
                    className="py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
                  >
                    ← Powrót
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // KROK 2: Wyświetlenie wyników z checkboxami
            <div className="space-y-6">
              {/* Nagłówek sticky */}
              <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">
                    🔧 Serwis: {formatDate(serviceDate)}
                  </h2>
                  <button
                    onClick={() => setShowServiceResults(false)}
                    className="px-4 py-2 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-sm"
                  >
                    Zmień kryteria
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedCategories.has('narty') && (
                    <span className="px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full text-sm text-white font-bold">
                      🎿 Narty
                    </span>
                  )}
                  {selectedCategories.has('deska') && (
                    <span className="px-3 py-1 bg-purple-500/30 border border-purple-500/50 rounded-full text-sm text-white font-bold">
                      🏂 Snowboard
                    </span>
                  )}
                  {selectedCategories.has('buty') && (
                    <span className="px-3 py-1 bg-orange-500/30 border border-orange-500/50 rounded-full text-sm text-white font-bold">
                      👢 Buty
                    </span>
                  )}
                </div>
                <p className="text-white/70 text-sm">
                  Sprzęt do przygotowania: <strong className="text-white">{serviceEquipment.length}</strong> pozycji
                  {checkedServiceItems.size > 0 && (
                    <span className="ml-2 text-green-400">
                      (zaniesiono: {checkedServiceItems.size})
                    </span>
                  )}
                </p>
              </div>

              {/* Lista sprzętu */}
              {serviceEquipment.length === 0 ? (
                <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
                  <span className="text-white text-xl font-medium">
                    📋 Brak sprzętu do przygotowania na wybrany dzień
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceEquipment.map((item, index) => {
                    const equipmentKey = `${item.kod}-${item.sprzet}-${index}`;
                    const isChecked = checkedServiceItems.has(equipmentKey);

                    // Określ kolor na podstawie kategorii
                    const categoryColors: Record<string, string> = {
                      'narty': 'border-blue-500/50',
                      'deska': 'border-purple-500/50',
                      'buty': 'border-orange-500/50',
                      'buty_sb': 'border-orange-500/50'
                    };
                    const borderColor = categoryColors[item.category] || 'border-white/20';

                    return (
                      <label
                        key={equipmentKey}
                        className={`flex items-center gap-4 p-4 lg:p-6 rounded-xl border-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${isChecked
                          ? 'bg-green-500/30 border-green-500/50 shadow-lg'
                          : `bg-white/5 ${borderColor} hover:bg-white/10`
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleServiceCheckboxToggle(equipmentKey)}
                          className="w-6 h-6 lg:w-7 lg:h-7 cursor-pointer accent-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white font-mono font-bold">
                              {item.kod}
                            </span>
                            <span className="text-xs text-white/50">
                              {item.category === 'narty' && '🎿'}
                              {item.category === 'deska' && '🏂'}
                              {(item.category === 'buty' || item.category === 'buty_sb') && '👢'}
                            </span>
                          </div>
                          <div className="text-lg lg:text-xl font-bold text-white mb-1">
                            {item.sprzet}
                          </div>
                          <div className="text-sm text-white/70">
                            👤 {item.klient}
                          </div>
                        </div>
                        {isChecked && (
                          <div className="text-2xl text-green-400">✓</div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Sticky footer z podsumowaniem */}
              <div className="sticky bottom-0 z-10 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white/70 text-sm">
                    Zaniesiono na serwis: <strong className="text-white">{checkedServiceItems.size}</strong> / {serviceEquipment.length}
                  </div>
                  {checkedServiceItems.size === serviceEquipment.length && serviceEquipment.length > 0 && (
                    <div className="text-green-400 font-bold text-sm">
                      ✓ Wszystko zaniesione
                    </div>
                  )}
                </div>
                <button
                  onClick={handleBackFromServiceMode}
                  className="w-full py-3 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  ← Powrót do wydania
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // WIDOK 0: Sprawdzenie kodu sprzętu
  if (checkMode) {
    return (
      <div
        className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-4 lg:p-6"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Overlay dla lepszej czytelności */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-6 lg:p-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 text-center">
              🔍 Sprawdź Kod Sprzętu
            </h2>

            <div className="space-y-6">
              {/* Pole wpisywania kodu */}
              <div className="space-y-3">
                <label className="block text-white font-bold text-sm uppercase tracking-wider opacity-90">
                  Wpisz kod sprzętu:
                </label>
                <input
                  type="text"
                  value={codeSearch}
                  onChange={(e) => {
                    setCodeSearch(e.target.value.toUpperCase());
                    setFoundReservation(null); // Reset wyników przy zmianie
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCodeSearch();
                    }
                  }}
                  placeholder="np. N001"
                  className="w-full px-4 py-4 bg-primary text-white text-xl font-mono placeholder-white/30 rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm text-center uppercase"
                  autoFocus
                />
              </div>

              {/* Przycisk szukaj */}
              <button
                onClick={handleCodeSearch}
                disabled={!codeSearch.trim()}
                className={`w-full py-4 px-6 rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm text-lg ${codeSearch.trim()
                  ? 'bg-green-600 hover:bg-green-700 text-white border border-white/10'
                  : 'bg-gray-600/50 text-white/50 border border-white/5 cursor-not-allowed'
                  }`}
              >
                🔍 Szukaj
              </button>

              {/* Wyniki wyszukiwania */}
              {foundReservation !== null && foundReservation ? (
                <div className="bg-green-600/30 border-2 border-green-500 rounded-lg p-6 space-y-3">
                  <div className="text-center text-green-200 font-bold text-lg mb-4">
                    ✓ Znaleziono rezerwację
                  </div>

                  <div className="bg-black/20 rounded-lg p-4 space-y-2">
                    <div className="text-white/70 text-sm">Sprzęt:</div>
                    <div className="text-white font-bold text-xl">{foundReservation.sprzet}</div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-4 space-y-2">
                    <div className="text-white/70 text-sm">Klient:</div>
                    <div className="text-white font-bold text-xl">{foundReservation.klient}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 rounded-lg p-4 space-y-2">
                      <div className="text-white/70 text-sm">Data od:</div>
                      <div className="text-white font-bold">{formatDate(foundReservation.od)}</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-4 space-y-2">
                      <div className="text-white/70 text-sm">Data do:</div>
                      <div className="text-white font-bold">{formatDate(foundReservation.do)}</div>
                    </div>
                  </div>
                </div>
              ) : foundReservation === null && codeSearch.trim() !== '' ? (
                <div className="bg-yellow-600/30 border border-yellow-500 rounded-lg p-6">
                  <p className="text-yellow-200 text-center font-medium">
                    ⚠️ Nie znaleziono aktywnej rezerwacji dla kodu: <strong>{codeSearch}</strong>
                  </p>
                  <p className="text-yellow-200/70 text-sm text-center mt-2">
                    (Sprawdzane są tylko aktualne i przyszłe rezerwacje)
                  </p>
                </div>
              ) : null}

              <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-200 text-sm font-medium">
                  ℹ️ Wpisz kod sprzętu, aby zobaczyć informacje o najbliższej rezerwacji.
                </p>
              </div>

              <button
                onClick={handleBackFromCheckMode}
                className="w-full py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
              >
                ← Powrót
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WIDOK 1: Wybór daty wydania (tylko dla normalnego trybu wydawania, nie dla serwis/sprawdź)
  if (!selectedDate && !serviceMode && !checkMode) {
    return (
      <div
        className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-4 lg:p-6"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Overlay dla lepszej czytelności */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-6 lg:p-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 text-center">
              📦 Wydanie Sprzętu
            </h2>

            <div className="space-y-6">
              <DatePickerButton
                label="Wybierz datę wydania"
                icon="📦"
                value={selectedDate}
                onChange={setSelectedDate}
              />

              <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-200 text-sm font-medium">
                  ℹ️ Wybierz datę, aby zobaczyć listę klientów z rezerwacjami rozpoczynającymi się tego dnia.
                </p>
              </div>

              {/* Przycisk powrotu */}
              <button
                onClick={onBack}
                className="w-full py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
              >
                ← Powrót
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WIDOK 2: Lista klientów (tylko dla normalnego trybu wydawania, nie dla serwis/sprawdź)
  if (!selectedClient && !serviceMode && !checkMode) {
    return (
      <div
        className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative p-4 lg:p-6"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Overlay dla lepszej czytelności */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Nagłówek sticky */}
          <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                📅 {formatDate(selectedDate)}
              </h2>
              <button
                onClick={handleBackToDatePicker}
                className="px-4 py-2 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-sm"
              >
                Zmień datę
              </button>
            </div>
            <p className="text-white/70 text-sm">
              Klienci z rezerwacjami: <strong className="text-white">{clientsForDate.length}</strong>
              {searchText && ` (wyświetlono: ${filteredClients.length})`}
            </p>
          </div>

          {/* Pole wyszukiwania klienta */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 whitespace-nowrap">
                🔍 Szukaj klienta:
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Wpisz nazwisko klienta..."
                className="flex-1 px-4 py-3 bg-primary text-white placeholder-white/30 rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm text-base"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-sm border border-white/10 whitespace-nowrap text-sm"
                >
                  Wyczyść
                </button>
              )}
            </div>

            {searchText && filteredClients.length === 0 && (
              <div className="mt-3 bg-yellow-600/30 border border-yellow-500 rounded-lg p-3">
                <p className="text-yellow-200 text-sm font-medium">
                  ⚠️ Nie znaleziono klienta o nazwisku zawierającym "<strong>{searchText}</strong>"
                </p>
              </div>
            )}
          </div>

          {/* Lista klientów */}
          {clientsForDate.length === 0 ? (
            <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
              <span className="text-white text-xl font-medium">
                📋 Brak klientów z rezerwacjami na wybrany dzień
              </span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
              <span className="text-white text-xl font-medium">
                🔍 Nie znaleziono klienta
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client, index) => (
                <div
                  key={`${client.klient}_${client.od}_${client.do}_${index}`}
                  onClick={() => handleClientClick(client)}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-lg active:scale-95 transition-transform touch-manipulation cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                        {client.klient}
                      </h3>
                      <div className="text-white/70 text-sm mb-1">
                        📅 {formatDate(client.od)} → {formatDate(client.do)}
                      </div>
                      <div className="text-white/60 text-xs">
                        🎿 {client.totalItems} {client.totalItems === 1 ? 'pozycja' : 'pozycji'} sprzętu
                      </div>
                    </div>
                    <div className="text-white text-3xl ml-4">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Przycisk powrotu */}
          <button
            onClick={onBack}
            className="w-full mt-6 py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
          >
            ← Powrót do rezerwacji
          </button>
        </div>
      </div>
    );
  }

  // WIDOK 3: Pełnoekranowy widok sprzętu klienta
  return (
    <div
      className="min-h-screen bg-cover bg-top bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: "url('/images/background.png')",
      }}
    >
      {/* Overlay dla lepszej czytelności */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nagłówek sticky */}
        <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="p-4 lg:p-6">
            <button
              onClick={handleBackToClientList}
              className="mb-4 py-3 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg flex items-center gap-2 touch-manipulation active:scale-95"
            >
              ← Powrót
            </button>
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
              {selectedClient.klient}
            </h2>
            <p className="text-white/70 text-sm">
              📅 {formatDate(selectedClient.od)} → {formatDate(selectedClient.do)}
            </p>
          </div>
        </div>

        {/* Lista sprzętu */}
        <div className="flex-1 p-4 lg:p-6 pb-24">
          {selectedClient.equipment.length === 0 ? (
            <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-12 text-center">
              <span className="text-white text-xl font-medium">
                📋 Brak sprzętu w rezerwacji
              </span>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {selectedClient.equipment.map((item, index) => {
                const equipmentKey = `${item.equipment}-${item.kod}-${index}`;
                const isChecked = checkedItems.has(equipmentKey);

                return (
                  <label
                    key={equipmentKey}
                    className={`flex items-center gap-4 p-4 lg:p-6 rounded-xl border-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${isChecked
                      ? 'bg-green-500/30 border-green-500/50 shadow-lg'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxToggle(equipmentKey)}
                      className="w-6 h-6 lg:w-7 lg:h-7 cursor-pointer accent-green-500"
                    />
                    <div className="flex-1">
                      <div className="text-lg lg:text-xl font-bold text-white mb-1">
                        {item.equipment}
                      </div>
                      <div className="text-sm lg:text-base text-white/70">
                        Kod: <strong className="text-white">{item.kod}</strong>
                      </div>
                    </div>
                    {isChecked && (
                      <div className="text-2xl">✓</div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer z podsumowaniem */}
        <div className="sticky bottom-0 z-20 bg-black/30 backdrop-blur-md border-t border-white/10 shadow-lg p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/70 text-sm">
                Zaznaczono: <strong className="text-white">{checkedItems.size}</strong> / {selectedClient.equipment.length}
              </div>
              {checkedItems.size === selectedClient.equipment.length && (
                <div className="text-green-400 font-bold text-sm">
                  ✓ Wszystko zaznaczone
                </div>
              )}
            </div>
            <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-3">
              <p className="text-blue-200 text-xs">
                💡 Zaznacz pozycje, które zostały wydane klientowi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

