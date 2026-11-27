/**
 * Pasek wyboru klienta dla aktywnej karty (osoby) w widoku Przeglądaj.
 * Wyszukiwanie po nazwisku (FireSnow + archiwum) i przycisk otwierający historię klienta.
 */

import React, { useEffect, useState } from 'react';
import { HistoryService, SOURCE_LABELS } from '../services/historyService';
import type { ClientGroup } from '../services/historyService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ClientPickerBar');

interface ClientPickerBarProps {
  client: ClientGroup | null;
  onClientChange: (client: ClientGroup | null) => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
}

export const ClientPickerBar: React.FC<ClientPickerBarProps> = ({
  client,
  onClientChange,
  isHistoryOpen,
  onToggleHistory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ClientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounce wyszukiwania; wynik z przestarzałego zapytania jest ignorowany
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await HistoryService.searchClients(searchTerm);
        if (cancelled) return;
        setResults(response.clients);
        setSearched(true);
      } catch (err) {
        logger.error('Błąd wyszukiwania klientów:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const selectClient = (selected: ClientGroup) => {
    onClientChange(selected);
    setSearchTerm('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="relative w-full bg-[#194576]/80 border-b border-[#2C699F] py-2 px-4">
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center gap-3">
        <span className="text-white font-bold text-sm uppercase tracking-wider">Klient:</span>

        {client && (
          <div className="flex items-center gap-2 bg-[#386BB2] text-white rounded-lg px-3 py-1 font-bold text-sm">
            <span>{client.pelna_nazwa}</span>
            {client.telefon && <span className="text-[#A6C2EF] font-normal">📞 {client.telefon}</span>}
            <button
              onClick={() => onClientChange(null)}
              className="text-red-300 hover:text-red-500"
              title="Odepnij klienta od tej osoby"
            >
              ✕
            </button>
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={client ? 'Zmień klienta (nazwisko)' : 'Wpisz nazwisko klienta'}
            className="w-64 px-3 py-1 rounded-lg bg-primary text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-400 shadow-sm text-sm"
          />

          {searchTerm.trim().length >= 2 && (isLoading || searched) && (
            <div className="absolute left-0 top-full mt-1 w-80 max-h-72 overflow-y-auto z-50 bg-[#0f2744] border border-white/20 rounded-lg shadow-2xl">
              {isLoading && <div className="p-3 text-white text-sm">Wyszukiwanie...</div>}
              {!isLoading && results.length === 0 && (
                <div className="p-3 text-[#A6C2EF] text-sm">Nie znaleziono klientów</div>
              )}
              {!isLoading &&
                results.map((result) => (
                  <button
                    key={result.key}
                    onClick={() => selectClient(result)}
                    className="w-full text-left p-3 hover:bg-white/10 border-b border-white/5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-semibold text-sm">{result.pelna_nazwa}</span>
                      <span className="flex gap-1">
                        {result.sources.map((source) => (
                          <span
                            key={source}
                            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap"
                          >
                            {SOURCE_LABELS[source]}
                          </span>
                        ))}
                      </span>
                    </div>
                    {result.telefon && <div className="text-[#A6C2EF] text-xs mt-0.5">📞 {result.telefon}</div>}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          onClick={onToggleHistory}
          disabled={!client}
          className={`px-4 py-1 rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-sm border border-white/10 ${
            isHistoryOpen ? 'bg-[#386BB2] text-white' : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600`}
          title={client ? 'Pokaż historię wypożyczeń klienta' : 'Najpierw wybierz klienta'}
        >
          📜 Historia
        </button>
      </div>
    </div>
  );
};
