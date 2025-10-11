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
  ski: {
    WAGA_MIN: number;
    WAGA_MAX: number;
    WZROST_MIN: number;
    WZROST_MAX: number;
    POZIOM: string;
    PLEC: string;
    PRZEZNACZENIE: string;
  };
  userCriteria: {
    wzrost: number;
    waga: number;
    poziom: number;
    plec: string;
    styl_jazdy: string;
  };
}

export const MatchIndicators: React.FC<MatchIndicatorsProps> = ({ dopasowanie, ski: _ski, userCriteria: _userCriteria }) => {
  console.log('src/components/MatchIndicators.tsx: Wyświetlanie wskaźników dopasowania:', dopasowanie);

  /**
   * Określa kolor na podstawie statusu dopasowania
   */
  const getIndicatorColor = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return 'text-white bg-green-500/30 border-green-400 shadow-green-400/20';
    } else if (status.includes('🟡 żółty')) {
      return 'text-white bg-yellow-500/30 border-yellow-400 shadow-yellow-400/20';
    } else if (status.includes('🔴 czerwony')) {
      return 'text-white bg-red-500/30 border-red-400 shadow-red-400/20';
    }
    return 'text-white bg-gray-500/30 border-gray-400 shadow-gray-400/20';
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania
   */
  // const getIndicatorIcon = (status: string): string => {
  //   if (status.includes('✅ zielony')) {
  //     return '✅';
  //   } else if (status.includes('🟡 żółty')) {
  //     return '⚠️';
  //   } else if (status.includes('🔴 czerwony')) {
  //     return '❌';
  //   }
  //   return '❓';
  // };

  /**
   * Skraca tekst statusu dla lepszej czytelności - teraz tylko ikony i nazwy
   */
  const getShortStatus = (_criterion: string, status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅';
    } else if (status.includes('🟡 żółty')) {
      return '⚠️';
    } else if (status.includes('🔴 czerwony')) {
      return '❌';
    }
    return '❓';
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
        const icon = getShortStatus(criterion.key, criterion.status);
        
        return (
          <div
            key={criterion.key}
            className={`px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}
            title={criterion.status} // Pełny tekst w tooltip
          >
            <span className="mr-1">{icon}</span>
            <span className="font-bold">{criterion.label}</span>
          </div>
        );
      })}
    </div>
  );
};
