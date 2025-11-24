/**
 * Komponent widoku historii wypożyczeń z MySQL (2022-2023)
 * Trzy kroki: wyszukiwanie klienta → wybór daty → wyświetlenie sprzętu
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryService } from '../services/historyService';
import type { ClientData, DateRange, HistoryEquipmentData } from '../services/historyService';

interface HistoryViewProps {
  onBack: () => void;
}

type HistoryStep = 'search' | 'dates' | 'equipment';

export const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const [step, setStep] = useState<HistoryStep>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [dates, setDates] = useState<DateRange[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateRange | null>(null);
  const [equipment, setEquipment] = useState<HistoryEquipmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Debounce dla wyszukiwania klientów
  useEffect(() => {
    if (step !== 'search' || searchTerm.trim().length < 2) {
      setClients([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const results = await HistoryService.searchClients(searchTerm);
        setClients(results);
      } catch (err) {
        console.error('HistoryView: Błąd wyszukiwania klientów:', err);
        setError('Błąd wyszukiwania klientów. Sprawdź połączenie z bazą danych.');
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, step]);

  // Pobieranie dat po wybraniu klienta
  const handleClientSelect = useCallback(async (client: ClientData) => {
    setSelectedClient(client);
    setIsLoading(true);
    setError('');

    try {
      const clientDates = await HistoryService.getClientDates(client.id);
      setDates(clientDates);
      setStep('dates');
    } catch (err) {
      console.error('HistoryView: Błąd pobierania dat:', err);
      setError('Błąd pobierania dat wypożyczeń. Sprawdź połączenie z bazą danych.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobieranie sprzętu po wybraniu daty
  const handleDateSelect = useCallback(async (dateRange: DateRange) => {
    if (!selectedClient) return;

    setSelectedDate(dateRange);
    setIsLoading(true);
    setError('');

    try {
      const clientEquipment = await HistoryService.getClientEquipment(
        selectedClient.id,
        dateRange.od,
        dateRange.do,
        dateRange.sezon
      );
      setEquipment(clientEquipment);
      setStep('equipment');
    } catch (err) {
      console.error('HistoryView: Błąd pobierania sprzętu:', err);
      setError('Błąd pobierania sprzętu. Sprawdź połączenie z bazą danych.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  // Funkcja powrotu do poprzedniego kroku
  const handleBack = () => {
    if (step === 'equipment') {
      setStep('dates');
      setSelectedDate(null);
      setEquipment([]);
    } else if (step === 'dates') {
      setStep('search');
      setSelectedClient(null);
      setDates([]);
      setSearchTerm('');
    }
  };

  return (
    <div className="min-h-screen bg-[#386BB2] p-3 lg:p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Historia wypożyczeń (23/22 - 19/18 - 18/17 - 17/16 - 16/15 - 15/14 - 14/13 - 13/12 - 12/11)
              </h1>
              <p className="text-[#A6C2EF] text-sm">
                {step === 'search' && 'Wyszukaj klienta po nazwisku'}
                {step === 'dates' && selectedClient && `Klient: ${selectedClient.pelna_nazwa}`}
                {step === 'equipment' && selectedClient && selectedDate &&
                  `Klient: ${selectedClient.pelna_nazwa} - ${selectedDate.od} - ${selectedDate.do}`}
              </p>
            </div>

            <div className="flex gap-2">
              {step !== 'search' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-[#2C699F] text-white rounded-lg font-semibold hover:bg-[#1E4D75] transition-all"
                >
                  ← Wstecz
                </button>
              )}
              <button
                onClick={onBack}
                className="px-4 py-2 bg-[#2C699F] text-white rounded-lg font-semibold hover:bg-[#1E4D75] transition-all"
              >
                Powrót
              </button>
            </div>
          </div>
        </div>

        {/* Krok 1: Wyszukiwanie klienta */}
        {step === 'search' && (
          <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6">
            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Wpisz nazwisko klienta:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="np. Kowalczyk"
                className="w-full px-4 py-2 rounded-lg bg-[#2C699F] text-white placeholder-[#A6C2EF] focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
                <p className="text-yellow-400 text-sm mt-2">
                  Wpisz co najmniej 2 znaki
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="text-white text-center py-4">
                Wyszukiwanie...
              </div>
            )}

            {!isLoading && clients.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-white font-semibold mb-2">
                  Znaleziono {clients.length} klientów:
                </h3>
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full text-left p-4 bg-[#2C699F] rounded-lg hover:bg-[#386BB2] transition-all"
                  >
                    <div className="text-white font-semibold">
                      {client.pelna_nazwa}
                    </div>
                    {client.telefon && (
                      <div className="text-[#A6C2EF] text-sm mt-1">
                        📞 {client.telefon}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isLoading && searchTerm.trim().length >= 2 && clients.length === 0 && !error && (
              <div className="text-[#A6C2EF] text-center py-4">
                Nie znaleziono klientów o nazwisku "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Krok 2: Wybór daty */}
        {step === 'dates' && selectedClient && (
          <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6">
            <h3 className="text-white font-semibold mb-4 text-lg">
              Wybierz datę wypożyczenia:
            </h3>

            {error && (
              <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="text-white text-center py-4">
                Pobieranie dat...
              </div>
            )}

            {!isLoading && dates.length > 0 && (
              <div className="space-y-2">
                {dates.map((dateRange, index) => (
                  <button
                    key={`${dateRange.od}-${dateRange.do}-${index}`}
                    onClick={() => handleDateSelect(dateRange)}
                    className="w-full text-left p-4 bg-[#2C699F] rounded-lg hover:bg-[#386BB2] transition-all"
                  >
                    <div className="text-white font-semibold">
                      Od: {dateRange.od} - Do: {dateRange.do} {dateRange.sezon ? `(Sezon: ${dateRange.sezon})` : ''}
                    </div>
                    <div className="text-[#A6C2EF] text-sm mt-1">
                      {dateRange.liczba_pozycji} {dateRange.liczba_pozycji === 1 ? 'pozycja' : 'pozycji'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isLoading && dates.length === 0 && !error && (
              <div className="text-[#A6C2EF] text-center py-4">
                Brak wypożyczeń dla tego klienta
              </div>
            )}
          </div>
        )}

        {/* Krok 3: Wyświetlenie sprzętu */}
        {step === 'equipment' && selectedClient && selectedDate && (
          <div className="bg-[#194576] rounded-lg shadow-lg p-4 lg:p-6">
            <h3 className="text-white font-semibold mb-4 text-lg">
              Wypożyczony sprzęt:
            </h3>

            {error && (
              <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="text-white text-center py-4">
                Pobieranie sprzętu...
              </div>
            )}

            {!isLoading && equipment.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#2C699F]">
                      <th className="px-4 py-2 text-white font-semibold">Kod</th>
                      <th className="px-4 py-2 text-white font-semibold">Nazwa sprzętu</th>
                      <th className="px-4 py-2 text-white font-semibold">Długość</th>
                      <th className="px-4 py-2 text-white font-semibold">Liczba dni</th>
                      <th className="px-4 py-2 text-white font-semibold">Status</th>
                      <th className="px-4 py-2 text-white font-semibold text-center">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item, index) => (
                      <tr
                        key={`${item.kod}-${index}`}
                        className="border-b border-[#2C699F] hover:bg-[#2C699F] transition-colors"
                      >
                        <td className="px-4 py-2 text-white">{item.kod || '-'}</td>
                        <td className="px-4 py-2 text-white">{item.sprzet || '-'}</td>
                        <td className="px-4 py-2 text-white">
                          {item.dlugosc ? `${item.dlugosc} cm` : '-'}
                        </td>
                        <td className="px-4 py-2 text-white">{item.liczba_dni || '-'}</td>
                        <td className="px-4 py-2 text-white">
                          {item.status || '-'}
                        </td>
                        {/* Wyświetl kwotę tylko w pierwszym wierszu, scalając dla wszystkich pozycji */}
                        {index === 0 && (
                          <td
                            className="px-4 py-2 text-white text-center align-middle font-bold text-lg border-l border-[#2C699F]"
                            rowSpan={equipment.length}
                          >
                            {item.cena || '0'} zł
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && equipment.length === 0 && !error && (
              <div className="text-[#A6C2EF] text-center py-4">
                Brak sprzętu dla wybranej daty
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

