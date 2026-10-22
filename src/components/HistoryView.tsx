/**
 * Komponent widoku historii wypożyczeń klientów: archiwum MySQL (2012-2023) + FireSnow (bieżące sezony)
 * Trzy kroki: wyszukiwanie klienta → wybór daty → wyświetlenie sprzętu
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryService } from '../services/historyService';
import type { ClientGroup, HistoryDateRange, HistoryEquipmentData, HistorySource } from '../services/historyService';
import { createLogger } from '../utils/logger';

interface HistoryViewProps {
  onBack: () => void;
}

type HistoryStep = 'search' | 'dates' | 'equipment';

const logger = createLogger('HistoryView');

const SOURCE_LABELS: Record<HistorySource, string> = {
  firesnow: 'FireSnow',
  mysql: 'Archiwum 2012–2023'
};

const SourceNotice: React.FC<{ sources: HistorySource[] }> = ({ sources }) => {
  if (sources.length === 0) return null;
  return (
    <div className="bg-yellow-600/30 border border-yellow-500/50 text-yellow-100 p-3 rounded-lg mb-4">
      {sources.includes('firesnow')
        ? 'FireSnow niedostępny, pokazano tylko archiwum.'
        : 'Archiwum 2012–2023 niedostępne, pokazano tylko FireSnow.'}
    </div>
  );
};

/**
 * Rabat jako tekst: "15%", "45 zł" lub "15% + 45 zł"; null gdy brak rabatu
 */
function formatDiscount(procent?: number, kwota?: number, prefix = ''): string | null {
  if (procent && kwota) return `${prefix}${procent}% (${kwota} zł)`;
  if (procent) return `${prefix}${procent}%`;
  if (kwota) return `${prefix}${kwota} zł`;
  return null;
}

/**
 * Dni gratis z polską odmianą: "1 dzień", "2 dni"; null gdy brak
 */
function formatFreeDays(dni?: number, prefix = '', suffix = ''): string | null {
  if (!dni) return null;
  return `${prefix}${dni} ${dni === 1 ? 'dzień' : 'dni'}${suffix}`;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const [step, setStep] = useState<HistoryStep>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientGroup[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientGroup | null>(null);
  const [dates, setDates] = useState<HistoryDateRange[]>([]);
  const [selectedDate, setSelectedDate] = useState<HistoryDateRange | null>(null);
  const [equipment, setEquipment] = useState<HistoryEquipmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [unavailableSources, setUnavailableSources] = useState<HistorySource[]>([]);

  // Debounce dla wyszukiwania klientów
  useEffect(() => {
    if (step !== 'search' || searchTerm.trim().length < 2) {
      setClients([]);
      setUnavailableSources([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const results = await HistoryService.searchClients(searchTerm);
        setClients(results.clients);
        setUnavailableSources(results.unavailableSources);
        if (results.unavailableSources.length === Object.keys(SOURCE_LABELS).length) {
          setError('Żadne źródło historii nie jest dostępne. Sprawdź połączenie z bazami danych.');
        }
      } catch (err) {
        logger.error('Błąd wyszukiwania klientów:', err);
        setError('Błąd wyszukiwania klientów. Sprawdź połączenie z bazą danych.');
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, step]);

  // Pobieranie dat po wybraniu klienta (okresy z obu źródeł)
  const handleClientSelect = useCallback(async (client: ClientGroup) => {
    setSelectedClient(client);
    setIsLoading(true);
    setError('');

    try {
      const result = await HistoryService.getClientDates(client);
      setDates(result.dates);
      setUnavailableSources(result.unavailableSources);
      if (result.unavailableSources.length === client.sources.length) {
        setError('Żadne źródło historii nie jest dostępne. Sprawdź połączenie z bazami danych.');
      }
      setStep('dates');
    } catch (err) {
      logger.error('Błąd pobierania dat:', err);
      setError('Błąd pobierania dat wypożyczeń. Sprawdź połączenie z bazą danych.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobieranie sprzętu po wybraniu daty (źródło wynika z okresu)
  const handleDateSelect = useCallback(async (dateRange: HistoryDateRange) => {
    setSelectedDate(dateRange);
    setIsLoading(true);
    setError('');

    try {
      const clientEquipment = await HistoryService.getClientEquipment(dateRange);
      setEquipment(clientEquipment);
      setStep('equipment');
    } catch (err) {
      logger.error('Błąd pobierania sprzętu:', err);
      setError('Błąd pobierania sprzętu. Sprawdź połączenie z bazą danych.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // FireSnow zwraca cenę per pozycja (sumujemy), archiwum MySQL kwotę całej umowy w każdym wierszu
  const totalPrice = selectedDate?.source === 'firesnow'
    ? String(Math.round(equipment.reduce((sum, item) => sum + (parseFloat(item.cena) || 0), 0) * 100) / 100)
    : equipment[0]?.cena || '0';

  const isFireSnow = selectedDate?.source === 'firesnow';

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
        {/* Header */}
        <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Historia wypożyczeń klientów
              </h1>
              <p className="text-white/70 text-sm">
                {step === 'search' && 'Wyszukaj klienta po nazwisku'}
                {step === 'dates' && selectedClient && `Klient: ${selectedClient.pelna_nazwa}`}
                {step === 'equipment' && selectedClient && selectedDate &&
                  `Klient: ${selectedClient.pelna_nazwa} - ${selectedDate.od} - ${selectedDate.do} (${SOURCE_LABELS[selectedDate.source]})`}
              </p>
            </div>

            <div className="flex gap-2">
              {step !== 'search' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  ← Wstecz
                </button>
              )}
              <button
                onClick={onBack}
                className="px-4 py-2 bg-[#0f2744]/50 hover:bg-[#0f2744]/70 text-white rounded-lg border border-white/5 hover:border-white/20 font-bold uppercase tracking-wider transition-all shadow-sm"
              >
                Powrót
              </button>
            </div>
          </div>
        </div>

        {/* Krok 1: Wyszukiwanie klienta */}
        {step === 'search' && (
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6">
            <div className="mb-4">
              <label className="block text-white font-bold text-sm uppercase tracking-wider mb-2">
                Wpisz nazwisko klienta:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="np. Kowalczyk"
                className="w-full px-4 py-2 rounded-lg bg-primary text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm"
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

            {error === '' && <SourceNotice sources={unavailableSources} />}

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
                    key={client.key}
                    onClick={() => handleClientSelect(client)}
                    className="w-full text-left p-4 bg-[#0f2744]/50 rounded-lg border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white font-semibold">
                        {client.pelna_nazwa}
                      </div>
                      <div className="flex gap-1">
                        {client.sources.map((source) => (
                          <span key={source} className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap">
                            {SOURCE_LABELS[source]}
                          </span>
                        ))}
                      </div>
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
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6">
            <h3 className="text-white font-semibold mb-4 text-lg">
              Wybierz datę wypożyczenia:
            </h3>

            {error && (
              <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {error === '' && <SourceNotice sources={unavailableSources} />}

            {isLoading && (
              <div className="text-white text-center py-4">
                Pobieranie dat...
              </div>
            )}

            {!isLoading && dates.length > 0 && (
              <div className="space-y-2">
                {dates.map((dateRange, index) => (
                  <button
                    key={`${dateRange.source}-${dateRange.client_id}-${dateRange.dokument_id ?? ''}-${dateRange.od}-${dateRange.do}-${index}`}
                    onClick={() => handleDateSelect(dateRange)}
                    className="w-full text-left p-4 bg-[#0f2744]/50 rounded-lg border border-white/5 hover:bg-[#0f2744]/70 hover:border-white/20 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white font-semibold">
                        {dateRange.numer ? `${dateRange.numer}: ` : ''}Od: {dateRange.od} - Do: {dateRange.do} {dateRange.sezon ? `(Sezon: ${dateRange.sezon})` : ''}
                      </div>
                      <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap">
                        {SOURCE_LABELS[dateRange.source]}
                      </span>
                    </div>
                    <div className="text-[#A6C2EF] text-sm mt-1">
                      {dateRange.liczba_pozycji} {dateRange.liczba_pozycji === 1 ? 'pozycja' : 'pozycji'}
                    </div>
                    {(() => {
                      const badges = [
                        formatDiscount(dateRange.rabat_procent, dateRange.rabat_kwota, 'Rabat '),
                        formatFreeDays(dateRange.dni_gratis, '+', ' gratis'),
                        dateRange.uwagi ? '📝 uwagi' : null
                      ].filter((b): b is string => b !== null);
                      return badges.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {badges.map((badge) => (
                            <span key={badge} className="text-xs px-2 py-1 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap">
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
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
          <div className="bg-black/20 rounded-xl border border-white/10 shadow-lg backdrop-blur-md p-4 lg:p-6">
            <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
              Wypożyczony sprzęt:
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap">
                {SOURCE_LABELS[selectedDate.source]}
              </span>
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

            {!isLoading && isFireSnow && (
              <div className="mb-4 p-4 bg-[#0f2744]/50 rounded-lg border border-white/5 shadow-sm text-left">
                <h4 className="text-white font-semibold mb-2">Szczegóły umowy</h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-[#A6C2EF]">Rabat:</dt>
                  <dd className="text-white">{formatDiscount(selectedDate.rabat_procent, selectedDate.rabat_kwota) ?? 'brak'}</dd>
                  <dt className="text-[#A6C2EF]">Dni gratis:</dt>
                  <dd className="text-white">{formatFreeDays(selectedDate.dni_gratis) ?? 'brak'}</dd>
                  <dt className="text-[#A6C2EF]">Uwagi:</dt>
                  <dd className="text-white whitespace-pre-wrap">{selectedDate.uwagi || 'brak'}</dd>
                </dl>
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
                      {isFireSnow && <th className="px-4 py-2 text-white font-semibold">Rabat</th>}
                      <th className="px-4 py-2 text-white font-semibold text-center">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item, index) => (
                      <tr
                        key={`${item.kod}-${index}`}
                        className="border-b border-white/10 hover:bg-white/10 transition-colors"
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
                        {isFireSnow && (
                          <td className="px-4 py-2 text-white">
                            {formatDiscount(item.rabat_procent, item.rabat_kwota) ?? '-'}
                          </td>
                        )}
                        {/* Kwota scalona dla wszystkich pozycji: FireSnow = suma pozycji, archiwum = kwota z pierwszego wiersza */}
                        {index === 0 && (
                          <td
                            className="px-4 py-2 text-white text-center align-middle font-bold text-lg border-l border-[#2C699F]"
                            rowSpan={equipment.length}
                          >
                            {totalPrice} zł
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

