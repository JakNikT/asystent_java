/**
 * Komponent wyświetlający kolorowe wskaźniki dopasowania dla każdego kryterium
 * console.log(src/components/MatchIndicators.tsx: Wyświetlanie wskaźników dopasowania)
 */

import React from 'react';

interface MatchIndicatorsProps {
  dopasowanie: {
    poziom: string;
    plec: string;
    waga: string;
    wzrost: string;
    przeznaczenie: string;
  };
}

export const MatchIndicators: React.FC<MatchIndicatorsProps> = ({ dopasowanie }) => {
  console.log('src/components/MatchIndicators.tsx: Wyświetlanie wskaźników dopasowania:', dopasowanie);

  /**
   * Określa kolor na podstawie statusu dopasowania
   */
  const getIndicatorColor = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return 'text-green-400 bg-green-400/20 border-green-400';
    } else if (status.includes('🟡 żółty')) {
      return 'text-yellow-400 bg-yellow-400/20 border-yellow-400';
    } else if (status.includes('🔴 czerwony')) {
      return 'text-red-400 bg-red-400/20 border-red-400';
    }
    return 'text-gray-400 bg-gray-400/20 border-gray-400';
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania
   */
  const getIndicatorIcon = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅';
    } else if (status.includes('🟡 żółty')) {
      return '⚠️';
    } else if (status.includes('🔴 czerwony')) {
      return '❌';
    }
    return '❓';
  };

  /**
   * Skraca tekst statusu dla lepszej czytelności
   */
  const getShortStatus = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return 'Idealne';
    } else if (status.includes('🟡 żółty')) {
      if (status.includes('poziom niżej')) return 'Poziom niżej';
      if (status.includes('Narta kobieca')) return 'Narta kobieca';
      if (status.includes('Narta męska')) return 'Narta męska';
      if (status.includes('tolerancja')) return 'Z tolerancją';
      return 'Akceptowalne';
    } else if (status.includes('🔴 czerwony')) {
      if (status.includes('2 poziomy niżej')) return '2 poziomy niżej';
      if (status.includes('niezgodna płeć')) return 'Niezgodna płeć';
      if (status.includes('niedopasowany')) return 'Niedopasowany';
      return 'Niedopasowane';
    }
    return 'Nieznane';
  };

  const criteria = [
    { key: 'poziom', label: 'Poziom', status: dopasowanie.poziom },
    { key: 'plec', label: 'Płeć', status: dopasowanie.plec },
    { key: 'waga', label: 'Waga', status: dopasowanie.waga },
    { key: 'wzrost', label: 'Wzrost', status: dopasowanie.wzrost },
    { key: 'przeznaczenie', label: 'Styl', status: dopasowanie.przeznaczenie }
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {criteria.map((criterion) => {
        const colorClass = getIndicatorColor(criterion.status);
        const icon = getIndicatorIcon(criterion.status);
        const shortStatus = getShortStatus(criterion.status);
        
        return (
          <div
            key={criterion.key}
            className={`px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}
            title={criterion.status} // Pełny tekst w tooltip
          >
            <span className="mr-1">{icon}</span>
            <span className="font-bold">{criterion.label}:</span>
            <span className="ml-1">{shortStatus}</span>
          </div>
        );
      })}
    </div>
  );
};
