import React, { useState, useMemo } from 'react';
import type { ReservationData } from '../services/reservationService';
import { createLogger } from '../utils/logger';

// src/components/EquipmentHandoutView.tsx: Logger dla EquipmentHandoutView
const logger = createLogger('EquipmentHandoutView');

interface EquipmentHandoutViewProps {
  reservations: ReservationData[];
  onBack: () => void;
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

// src/components/EquipmentHandoutView.tsx: Komponent do wydawania sprzętu klientom - zoptymalizowany pod mobile
export const EquipmentHandoutView: React.FC<EquipmentHandoutViewProps> = ({ reservations, onBack }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<ClientWithReservation | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState<string>(''); // src/components/EquipmentHandoutView.tsx: Pole wyszukiwania klienta

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

  // src/components/EquipmentHandoutView.tsx: Funkcja do normalizacji daty (YYYY-MM-DD)
  const normalizeDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
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

  // src/components/EquipmentHandoutView.tsx: Filtrowanie klientów po nazwie
  const filteredClients = useMemo(() => {
    if (!searchText) return clientsForDate;
    
    const searchLower = searchText.toLowerCase();
    return clientsForDate.filter(client => 
      client.klient.toLowerCase().includes(searchLower)
    );
  }, [clientsForDate, searchText]);

  // WIDOK 1: Wybór daty wydania
  if (!selectedDate) {
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
              <div>
                <label className="block text-white font-bold text-lg mb-3 uppercase tracking-wider">
                  Wybierz datę wydania:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-6 py-4 bg-primary text-white rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm text-lg"
                />
              </div>

              <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-200 text-sm font-medium">
                  ℹ️ Wybierz datę, aby zobaczyć listę klientów z rezerwacjami rozpoczynającymi się tego dnia.
                </p>
              </div>

              <button
                onClick={onBack}
                className="w-full py-4 px-6 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm text-lg"
              >
                ← Powrót do rezerwacji
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WIDOK 2: Lista klientów
  if (!selectedClient) {
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
                    className={`flex items-center gap-4 p-4 lg:p-6 rounded-xl border-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      isChecked
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

